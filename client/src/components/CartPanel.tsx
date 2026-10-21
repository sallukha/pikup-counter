/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, AlertCircle } from 'lucide-react';
import { CartItem } from '../types';
import { formatPaiseToINR } from '../utils/currency';
import { SnackVisual } from './SnackVisual';

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  isSubmittingOrder: boolean;
  submitError: string | null;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isSubmittingOrder,
  submitError,
}) => {
  if (!isOpen) return null;

  // Calculate estimated total in paise for display preview
  const estimatedSubtotalPaise = items.reduce(
    (total, item) => total + item.product.pricePaise * item.quantity,
    0
  );
  const totalItemsCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-heading"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                <ShoppingBag className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              </div>
              <div>
                <h3 id="cart-drawer-heading" className="font-display font-extrabold text-slate-900 text-lg tracking-tight">
                  Your Snack Tray
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {totalItemsCount} {totalItemsCount === 1 ? 'snack item' : 'snack items'} selected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  disabled={isSubmittingOrder}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 rounded-md transition cursor-pointer disabled:opacity-50"
                  title="Remove all items from tray"
                >
                  Clear Tray
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close snack tray drawer"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Submission Error Alert */}
          {submitError && (
            <div className="mx-4 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Order could not be placed</span>
                <span className="mt-0.5 block opacity-90">{submitError}</span>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm">Your tray is empty</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Select snacks from the shelf to place your self-service counter order.
                </p>
              </div>
            ) : (
              items.map(({ product, quantity }) => {
                const isMax = quantity >= product.availableUnits;
                const itemTotalPaise = product.pricePaise * quantity;

                return (
                  <div
                    key={product.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 bg-white flex gap-3 items-center justify-between shadow-2xs hover:border-slate-300 transition"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                      <SnackVisual
                        name={product.name}
                        category={product.category}
                        imageUrl={product.imageUrl}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-display text-sm font-bold text-slate-900 truncate">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="font-mono tabular-nums">
                          {formatPaiseToINR(product.pricePaise)} each
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="font-mono tabular-nums text-slate-800 font-semibold">
                          {formatPaiseToINR(itemTotalPaise)}
                        </span>
                      </div>

                      {isMax && (
                        <p className="text-[11px] text-amber-700 font-semibold mt-1">
                          Max available ({product.availableUnits} units)
                        </p>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                          disabled={isSubmittingOrder}
                          aria-label={`Decrease quantity of ${product.name}`}
                          className="p-1.5 hover:bg-slate-200 active:bg-slate-300 text-slate-600 transition cursor-pointer disabled:opacity-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-mono font-semibold text-xs text-slate-900 tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                          disabled={isMax || isSubmittingOrder}
                          aria-label={`Increase quantity of ${product.name}`}
                          className="p-1.5 hover:bg-slate-200 active:bg-slate-300 text-slate-600 transition cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id)}
                        disabled={isSubmittingOrder}
                        aria-label={`Remove ${product.name} from tray`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200/80 bg-slate-50/50 space-y-4">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Selected Items</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {totalItemsCount}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-semibold text-slate-900">Estimated Total</span>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                      {formatPaiseToINR(estimatedSubtotalPaise)}
                    </span>
                    <span className="block text-[11px] text-slate-500 font-normal">
                      Authoritative total calculated by counter server
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onCheckout}
                  disabled={items.length === 0 || isSubmittingOrder}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  {isSubmittingOrder ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Reserving Snacks on Counter...</span>
                    </>
                  ) : (
                    <>
                      <span>Place Order & Pay</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Simulated UPI payment window begins upon submission</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
