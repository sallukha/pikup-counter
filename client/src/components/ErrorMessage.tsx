/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Settings2 } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  retryLabel?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  onOpenSettings,
  retryLabel = 'Try Again',
}) => {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-slate-800 shadow-xs max-w-2xl mx-auto my-6"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed font-sans">{message}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{retryLabel}</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Configure Backend URL</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
