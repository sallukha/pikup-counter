/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const CatalogSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs animate-pulse flex flex-col justify-between"
          aria-hidden="true"
        >
          <div>
            <div className="w-full h-44 bg-slate-100" />
            <div className="p-5 space-y-3">
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-5 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                <div className="h-6 w-20 bg-slate-200 rounded" />
                <div className="h-4 w-14 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
          <div className="p-5 pt-0">
            <div className="h-10 w-full bg-slate-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};
