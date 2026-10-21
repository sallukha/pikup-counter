/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';

export interface UsePerformanceCountdownOptions {
  expiresInSeconds: number;
  responseReceivedAt: number; // Captured using performance.now()
  roundTripDelayMs?: number;
  onExpire?: () => void;
}

export interface UsePerformanceCountdownResult {
  remainingSeconds: number;
  formattedTime: string;
  isExpired: boolean;
  progressPercent: number;
}

/**
 * High-precision countdown timer based on `performance.now()`.
 *
 * Guarantees:
 * - Does not use wall-clock time (Date.now()) which can be modified by user/system clock shifts.
 * - Measures elapsed time strictly via high-resolution monotonic performance.now().
 * - Deducts estimated half-round-trip network latency.
 * - Never goes negative (clamped at 0).
 * - Fires onExpire once when reaching zero.
 */
export function usePerformanceCountdown({
  expiresInSeconds,
  responseReceivedAt,
  roundTripDelayMs = 0,
  onExpire,
}: UsePerformanceCountdownOptions): UsePerformanceCountdownResult {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const hasFiredExpireRef = useRef(false);

  // Network delay estimate: half of round-trip time in seconds
  const networkDelaySeconds = Math.max(0, roundTripDelayMs / 2000);
  const totalWindowSeconds = Math.max(1, expiresInSeconds - networkDelaySeconds);

  const calculateRemaining = (): number => {
    const elapsedMs = performance.now() - responseReceivedAt;
    const elapsedSeconds = elapsedMs / 1000;
    const remaining = Math.max(0, expiresInSeconds - networkDelaySeconds - elapsedSeconds);
    return Math.max(0, remaining);
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => calculateRemaining());
  const [isExpired, setIsExpired] = useState<boolean>(() => calculateRemaining() <= 0);

  useEffect(() => {
    hasFiredExpireRef.current = false;

    const tick = () => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        if (!hasFiredExpireRef.current) {
          hasFiredExpireRef.current = true;
          onExpireRef.current?.();
        }
      }
    };

    // Initial check
    tick();

    // Check frequently (every 200ms) for smooth rendering and accurate sub-second expiry
    const intervalId = window.setInterval(tick, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expiresInSeconds, responseReceivedAt, networkDelaySeconds]);

  const wholeSeconds = Math.ceil(remainingSeconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = Math.min(
    100,
    Math.max(0, (remainingSeconds / totalWindowSeconds) * 100)
  );

  return {
    remainingSeconds,
    formattedTime,
    isExpired: isExpired || remainingSeconds <= 0,
    progressPercent,
  };
}
