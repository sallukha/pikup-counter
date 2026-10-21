/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  QrCode,
  ShieldAlert,
  PackageCheck,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CreateOrderResponse, OrderDetails, OrderStatus } from '../types';
import { formatPaiseToINR } from '../utils/currency';
import { usePerformanceCountdown } from '../utils/timer';
import { api, getApiBaseUrl } from '../services/api';

interface PaymentStatusProps {
  order: CreateOrderResponse;
  responseReceivedAt: number; // Monotonic performance.now() captured at response time
  roundTripDelayMs: number;
  onNewOrder: () => void;
  onOrderCancelled?: () => void;
}

const TERMINAL_STATUSES: Set<OrderStatus> = new Set([
  'paid',
  'expired',
  'needs_review',
  'picked_up',
  'cancelled',
]);

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  order,
  responseReceivedAt,
  roundTripDelayMs,
  onNewOrder,
  onOrderCancelled,
}) => {
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    id: order.id,
    status: order.status || 'pending',
    totalPaise: order.totalPaise,
    expiresInSeconds: order.expiresInSeconds,
  });

  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [isTriggeringTestWebhook, setIsTriggeringTestWebhook] = useState(false);
  const [testWebhookMessage, setTestWebhookMessage] = useState<string | null>(null);

  // Polling management refs
  const pollingIntervalRef = useRef<number | null>(null);
  const isPollingActiveRef = useRef<boolean>(true);
  const isRequestInProgressRef = useRef<boolean>(false);

  // Handle countdown expiry event: Backend remains authoritative, so we poll status immediately
  const handleCountdownExpire = useCallback(() => {
    // Check authoritative status from server
    void fetchLatestStatus();
  }, []);

  const { remainingSeconds, formattedTime, isExpired, progressPercent } =
    usePerformanceCountdown({
      expiresInSeconds: order.expiresInSeconds,
      responseReceivedAt,
      roundTripDelayMs,
      onExpire: handleCountdownExpire,
    });

  // Authoritative status check from server
  const fetchLatestStatus = async () => {
    if (isRequestInProgressRef.current) return;
    isRequestInProgressRef.current = true;

    try {
      const latest = await api.getOrderStatus(order.id);
      setOrderDetails(latest);
      setPollingError(null);
      setConsecutiveErrors(0);

      // Stop polling on terminal states
      if (TERMINAL_STATUSES.has(latest.status)) {
        stopPolling();
      }
    } catch (err: any) {
      setConsecutiveErrors((prev) => prev + 1);
      // Soft non-blocking warning for temporary network hiccups
      setPollingError(err?.message || 'Temporary network issue checking order status.');
    } finally {
      isRequestInProgressRef.current = false;
    }
  };

  const stopPolling = () => {
    isPollingActiveRef.current = false;
    if (pollingIntervalRef.current !== null) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Status Polling Effect: Every 2.5 seconds
  useEffect(() => {
    isPollingActiveRef.current = true;

    // Immediately fetch initial status
    void fetchLatestStatus();

    // Start 2.5 second polling interval
    pollingIntervalRef.current = window.setInterval(() => {
      if (isPollingActiveRef.current) {
        void fetchLatestStatus();
      }
    }, 2500);

    return () => {
      stopPolling();
    };
  }, [order.id]);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id).then(() => {
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    });
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order and release inventory?')) {
      return;
    }
    setIsCancelling(true);
    try {
      await api.cancelOrder(order.id);
      await fetchLatestStatus();
      onOrderCancelled?.();
    } catch (err: any) {
      alert(`Could not cancel order: ${err?.message || 'Server error'}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // Optional tester helper: Trigger backend webhook simulation endpoint if the Express backend provides one
  const handleTriggerBackendWebhook = async () => {
    setIsTriggeringTestWebhook(true);
    setTestWebhookMessage(null);
    try {
      const baseUrl = getApiBaseUrl();
      const endpoint = baseUrl ? `${baseUrl}/webhooks/payment` : '/webhooks/payment';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          status: 'paid',
          amountPaise: order.totalPaise,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setTestWebhookMessage('Simulated payment webhook received by backend. Polling will confirm...');
        // Let polling pick it up authoritatively
        await fetchLatestStatus();
      } else {
        setTestWebhookMessage(
          `Backend webhook responded with status ${res.status}. Use your backend team's webhook sender script.`
        );
      }
    } catch {
      setTestWebhookMessage(
        'Direct test webhook endpoint not reachable. Please execute your backend webhook sender script.'
      );
    } finally {
      setIsTriggeringTestWebhook(false);
    }
  };

  const isTerminal = TERMINAL_STATUSES.has(orderDetails.status);
  const isPaid = orderDetails.status === 'paid';
  const isPickedUp = orderDetails.status === 'picked_up';
  const isOrderExpired = orderDetails.status === 'expired' || (isExpired && !isPaid);
  const isNeedsReview = orderDetails.status === 'needs_review';

  return (
    <div className="max-w-2xl mx-auto my-6 px-4">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden">
        {/* Top Status Header */}
        <div className="p-6 sm:p-8 text-center border-b border-slate-100">
          {/* Status Icon */}
          <div className="flex justify-center mb-4">
            {isPaid ? (
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
              </div>
            ) : isPickedUp ? (
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-xs">
                <PackageCheck className="w-10 h-10" aria-hidden="true" />
              </div>
            ) : isOrderExpired ? (
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-xs">
                <Clock className="w-10 h-10" aria-hidden="true" />
              </div>
            ) : isNeedsReview ? (
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                <ShieldAlert className="w-10 h-10" aria-hidden="true" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs border border-emerald-100">
                <QrCode className="w-10 h-10" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Title & Amount */}
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isPaid
              ? 'Payment Confirmed!'
              : isPickedUp
              ? 'Order Collected!'
              : isOrderExpired
              ? 'Payment Window Expired'
              : isNeedsReview
              ? 'Payment Needs Review'
              : 'Awaiting UPI Payment'}
          </h2>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Amount Due:</span>
            <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
              {formatPaiseToINR(orderDetails.totalPaise)}
            </span>
          </div>

          {/* Order ID Tag */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-700">
            <span>Order #{order.id}</span>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="text-slate-500 hover:text-slate-900 transition cursor-pointer"
              title="Copy Order ID"
              aria-label="Copy Order ID"
            >
              {copiedOrderId ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Live Countdown & Polling Section (Visible while awaiting payment) */}
        {!isTerminal && (
          <div className="p-6 sm:p-8 bg-slate-50/60 border-b border-slate-100 space-y-6">
            {/* Countdown Box */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 text-center shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Time Remaining to Complete Payment
              </span>

              <div
                className={`text-5xl sm:text-6xl font-mono font-bold tracking-tight my-2 tabular-nums ${
                  remainingSeconds <= 30 ? 'text-rose-600 animate-pulse' : 'text-slate-900'
                }`}
              >
                {formattedTime}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3 max-w-md mx-auto">
                <div
                  className={`h-full transition-all duration-300 ease-linear ${
                    remainingSeconds <= 30 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-xs text-slate-500 mt-3 font-medium">
                Simulated UPI payment — waiting for payment confirmation
              </p>
            </div>

            {/* Polling Pulse Status Indicator */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Polling counter status every 2.5s</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                Status: {orderDetails.status}
              </span>
            </div>

            {/* Soft temporary error indicator if polling encountered network blips */}
            {pollingError && consecutiveErrors > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-semibold">Reconnecting to server...</span>
                  <p className="mt-0.5 opacity-90">{pollingError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal Status Explanations */}
        <div className="p-6 sm:p-8 space-y-6">
          {isPaid && (
            <div className="bg-emerald-50/80 rounded-2xl border border-emerald-200 p-5 text-emerald-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Ready for Pickup at Snack Counter #1</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Your payment of <strong className="font-mono">{formatPaiseToINR(orderDetails.totalPaise)}</strong> has been verified by the backend. Please show your Order ID <strong>#{order.id}</strong> to the counter assistant or collect your packaged snacks from the tray locker.
              </p>
              {orderDetails.paidAt && (
                <div className="text-[11px] text-emerald-700 font-mono">
                  Confirmed At: {new Date(orderDetails.paidAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {isPickedUp && (
            <div className="bg-slate-100 rounded-2xl border border-slate-200 p-5 text-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>Order Picked Up</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This order has been collected from the counter. Enjoy your fresh snacks!
              </p>
            </div>
          )}

          {isOrderExpired && (
            <div className="bg-rose-50/80 rounded-2xl border border-rose-200 p-5 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Payment Window Expired</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                The payment countdown reached zero and the counter server released the reserved inventory. If you already sent money, contact counter support with Order ID #{order.id}.
              </p>
            </div>
          )}

          {isNeedsReview && (
            <div className="bg-amber-50/80 rounded-2xl border border-amber-200 p-5 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Manual Verification Required</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                The transaction requires manual verification. <strong>Please do NOT pay again.</strong> Please present Order ID #{order.id} to the counter manager.
              </p>
            </div>
          )}

          {/* Simulated Payment Instructions Callout (Section 7) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                <Radio className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                  Simulated Payment & Webhook Architecture
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  There is no real payment gateway in this system. Payment confirmation is simulated exclusively by the backend webhook. The backend team uses a signed webhook sender script to transmit the payment event to the server.
                </p>
              </div>
            </div>

            {/* Developer / Tester Webhook Helper Drawer */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWebhookGuide(!showWebhookGuide)}
                className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 font-medium py-1 cursor-pointer"
              >
                <span>Backend Webhook Simulator Guide</span>
                {showWebhookGuide ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showWebhookGuide && (
                <div className="mt-3 p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono space-y-2 overflow-x-auto">
                  <p className="text-[11px] text-slate-400"># Send simulated payment event via cURL:</p>
                  <pre className="text-emerald-400 whitespace-pre-wrap break-all text-[11px]">
{`curl -X POST ${getApiBaseUrl() || 'http://localhost:4000'}/webhooks/payment \\
  -H "Content-Type: application/json" \\
  -d '{"orderId":"${order.id}","status":"paid","amountPaise":${order.totalPaise}}'`}
                  </pre>

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerBackendWebhook}
                      disabled={isTriggeringTestWebhook}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-sans text-xs font-medium transition cursor-pointer disabled:opacity-60"
                    >
                      {isTriggeringTestWebhook ? 'Sending to Backend...' : 'Trigger Test Webhook on Server'}
                    </button>
                    {testWebhookMessage && (
                      <span className="text-[11px] text-slate-300 font-sans block w-full mt-1">
                        {testWebhookMessage}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {!isTerminal && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-medium transition cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}

            <button
              type="button"
              onClick={onNewOrder}
              className="w-full sm:w-auto ml-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isTerminal ? 'Start New Snack Order' : 'Order More Snacks'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
