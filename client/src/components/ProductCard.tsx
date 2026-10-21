/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Check, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { formatPaiseToINR } from '../utils/currency';
import { SnackVisual } from './SnackVisual';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAddToCart,
}) => {
  const isOutOfStock = product.availableUnits <= 0;
  const isAtCartLimit = quantityInCart >= product.availableUnits;
  const canAdd = !isOutOfStock && !isAtCartLimit;
  const remainingCanAdd = Math.max(0, product.availableUnits - quantityInCart);

  return (
    <article
      className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
        isOutOfStock
          ? 'border-slate-200 opacity-75'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div>
        {/* Visual Slot */}
        <div className="relative">
          <SnackVisual
            name={product.name}
            category={product.category}
            imageUrl={product.imageUrl}
            className="w-full h-44"
          />

          {/* Stock Badges */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            {isOutOfStock ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                Sold Out
              </span>
            ) : product.availableUnits <= 3 ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                Only {product.availableUnits} left
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-900/75 text-white backdrop-blur-xs">
                {product.availableUnits} available
              </span>
            )}
          </div>

          {quantityInCart > 0 && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-emerald-600 text-white shadow-xs">
                <Check className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
                <span>{quantityInCart} in tray</span>
              </span>
            </div>
          )}
        </div>

        {/* Content Slot */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1 font-sans">
            <span>{product.category || 'Fresh Snack'}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Counter Ready</span>
          </div>

          <h3 className="font-display font-bold text-[17px] text-slate-900 leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Price & Availability */}
          <div className="mt-4 flex items-baseline justify-between pt-3 border-t border-slate-100">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Price</span>
              <span className="text-xl font-bold font-mono text-slate-900 tabular-nums tracking-tight">
                {formatPaiseToINR(product.pricePaise)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Stock</span>
              <span
                className={`text-xs font-bold font-mono tabular-nums ${
                  isOutOfStock ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {product.availableUnits} units
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 sm:p-5 pt-0">
        <button
          type="button"
          onClick={() => onAddToCart(product)}
          disabled={!canAdd}
          aria-label={
            isOutOfStock
              ? `${product.name} is out of stock`
              : isAtCartLimit
              ? `Maximum available units of ${product.name} added`
              : `Add ${product.name} to cart`
          }
          className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 ${
            !canAdd
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs hover:shadow-sm'
          }`}
        >
          {isOutOfStock ? (
            <span>Out of Stock</span>
          ) : isAtCartLimit ? (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Max Stock in Tray
            </span>
          ) : (
            <>
              <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
              <span>Add to Tray</span>
              {quantityInCart > 0 && (
                <span className="text-xs text-emerald-100 font-mono">
                  ({remainingCanAdd} more)
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </article>
  );
};
