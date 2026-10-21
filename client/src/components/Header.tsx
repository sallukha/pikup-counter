/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingBag, RefreshCw, Settings2, Store } from 'lucide-react';

interface HeaderProps {
  totalCartItems: number;
  onOpenCart: () => void;
  onRefreshCatalog: () => void;
  isRefreshing: boolean;
  onOpenSettings: () => void;
  isBackendConnected: boolean | null;
}

export const Header: React.FC<HeaderProps> = ({
  totalCartItems,
  onOpenCart,
  onRefreshCatalog,
  isRefreshing,
  onOpenSettings,
  isBackendConnected,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 ring-4 ring-emerald-50">
            <Store className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
                Pickup Counter
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium tracking-normal mt-1 hidden sm:block">
              Order fresh · Pay securely · Pick up easily
            </p>
          </div>
        </div>

        {/* Zone 2: Counter Info & Refresh Controls */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={onRefreshCatalog}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-emerald-600 cursor-pointer"
            title="Refresh product stock from counter server"
            aria-label="Refresh snack catalog"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden md:inline">Refresh Stock</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 cursor-pointer"
            title="Configure Backend API endpoint URL"
            aria-label="Backend API configuration settings"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span className="hidden lg:inline text-xs">API Config</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected === true
                  ? 'bg-emerald-500'
                  : isBackendConnected === false
                  ? 'bg-amber-500'
                  : 'bg-slate-300'
              }`}
              title={
                isBackendConnected === true
                  ? 'Connected to Express backend'
                  : isBackendConnected === false
                  ? 'Backend offline / unreachable'
                  : 'Checking backend status'
              }
              aria-label={
                isBackendConnected === true
                  ? 'Backend online'
                  : isBackendConnected === false
                  ? 'Backend unreachable'
                  : 'Checking backend'
              }
            />
          </button>
        </div>

        {/* Zone 3: Primary Action - Cart Trigger */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`View cart with ${totalCartItems} ${totalCartItems === 1 ? 'item' : 'items'}`}
            className="relative inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-sm transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="hidden sm:inline">My Tray</span>
            <span
              className={`inline-flex items-center justify-center font-mono font-semibold text-xs px-2 py-0.5 rounded-full ${
                totalCartItems > 0
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {totalCartItems}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
