/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, api } from '../services/api';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const BackendSettingsModal: React.FC<BackendSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    status: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getApiBaseUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiBaseUrl(urlInput.trim() || null);
    onSaved();
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    // Temporarily set to test
    const previous = getApiBaseUrl();
    setApiBaseUrl(urlInput.trim() || null);
    try {
      const res = await api.testConnection();
      setTestResult(res);
    } finally {
      setApiBaseUrl(previous || null);
      setTesting(false);
    }
  };

  const handlePreset = (url: string) => {
    setUrlInput(url);
    setTestResult(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backend-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Server className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 id="backend-settings-title" className="font-display font-bold text-slate-900 text-lg tracking-tight">
                Counter Backend Connection
              </h3>
              <p className="text-xs text-slate-500 font-medium">Configure Express API Host & Port</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-slate-700">
          <div>
            <label htmlFor="api-base-url" className="block text-xs font-semibold text-slate-900 mb-1.5">
              API Base URL
            </label>
            <div className="relative">
              <input
                id="api-base-url"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. http://localhost:4000 (or leave empty for relative proxy)"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition font-mono"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Leave blank to use the Vite proxy (<code className="font-mono">/products</code>, <code className="font-mono">/orders</code>).
            </p>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-xs font-semibold text-slate-600 block mb-2">Quick Presets:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePreset('http://localhost:4000')}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 font-mono text-slate-700 transition cursor-pointer"
              >
                http://localhost:4000
              </button>
              <button
                type="button"
                onClick={() => handlePreset('http://localhost:5000')}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 font-mono text-slate-700 transition cursor-pointer"
              >
                http://localhost:5000
              </button>
              <button
                type="button"
                onClick={() => handlePreset('')}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 font-mono text-slate-700 transition cursor-pointer"
              >
                / (Relative Proxy)
              </button>
            </div>
          </div>

          {/* Test connection feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{testResult.ok ? 'Backend reachable' : 'Connection failed'}</p>
                <p className="mt-0.5 text-xs opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Backend guide hint */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Starting the Express backend:</p>
            <p>Run <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-slate-900">npm run server</code> or <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-slate-900">node server.js</code> in your backend directory.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
