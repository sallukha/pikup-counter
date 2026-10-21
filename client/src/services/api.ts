/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ApiResponseMeta,
  CreateOrderPayload,
  CreateOrderResponse,
  OrderDetails,
  OrderStatus,
  Product,
} from '../types';

const STORAGE_KEY_API_URL = 'PICKUP_COUNTER_API_BASE_URL';

/**
 * Retrieves the currently active API base URL.
 * Priority:
 * 1. User runtime override saved in localStorage
 * 2. Vite environment variable `VITE_API_BASE_URL`
 * 3. Default fallback (empty string for relative / proxy paths)
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(STORAGE_KEY_API_URL);
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/+$/, '');
    }
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return '';
}

/**
 * Saves a user-defined API base URL (useful for connecting to Express on port 4000/5000).
 */
export function setApiBaseUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  } else {
    localStorage.setItem(STORAGE_KEY_API_URL, url.trim().replace(/\/+$/, ''));
  }
}

/**
 * Builds an absolute or relative URL based on configured base.
 */
function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Normalizes varied backend response shapes into the strict Product interface.
 */
function normalizeProduct(raw: any, index: number): Product {
  const id = String(raw.id ?? raw._id ?? raw.productId ?? `product-${index}`);
  const name = String(raw.name ?? raw.title ?? raw.productName ?? 'Snack Item');

  // Authoritative integer paise
  const pricePaise = Number(
    raw.pricePaise ??
      raw.price_paise ??
      raw.paise ??
      (typeof raw.price === 'number' ? Math.round(raw.price * 100) : 0)
  );

  const availableUnits = Number(
    raw.availableUnits ??
      raw.available_units ??
      raw.stock ??
      raw.quantity ??
      raw.availableQuantity ??
      0
  );

  return {
    id,
    name,
    pricePaise: isNaN(pricePaise) ? 0 : Math.max(0, Math.round(pricePaise)),
    availableUnits: isNaN(availableUnits) ? 0 : Math.max(0, Math.floor(availableUnits)),
    imageUrl: raw.imageUrl || raw.image_url || raw.image,
    category: raw.category || raw.type || 'Snack',
    description: raw.description,
  };
}

/**
 * Normalizes varied backend response shapes into the strict CreateOrderResponse interface.
 */
function normalizeCreateOrderResponse(raw: any): CreateOrderResponse {
  const id = String(raw.id ?? raw.orderId ?? raw._id ?? '');
  const totalPaise = Number(
    raw.totalPaise ??
      raw.total_paise ??
      raw.amountPaise ??
      (typeof raw.total === 'number' ? Math.round(raw.total * 100) : 0)
  );
  const expiresInSeconds = Number(
    raw.expiresInSeconds ??
      raw.expires_in_seconds ??
      raw.expiresIn ??
      raw.expirySeconds ??
      120
  );

  return {
    id,
    totalPaise: isNaN(totalPaise) ? 0 : Math.round(totalPaise),
    expiresInSeconds: isNaN(expiresInSeconds) ? 120 : Math.max(0, expiresInSeconds),
    status: raw.status as OrderStatus | undefined,
    createdAt: raw.createdAt || raw.created_at,
  };
}

/**
 * Normalizes varied order status responses into the strict OrderDetails interface.
 */
function normalizeOrderDetails(raw: any): OrderDetails {
  const id = String(raw.id ?? raw.orderId ?? raw._id ?? '');
  const rawStatus = String(raw.status ?? raw.orderStatus ?? raw.state ?? 'pending').toLowerCase();

  let status: OrderStatus = 'pending';
  if (rawStatus === 'paid' || rawStatus === 'completed' || rawStatus === 'confirmed') {
    status = 'paid';
  } else if (rawStatus === 'expired' || rawStatus === 'timeout') {
    status = 'expired';
  } else if (rawStatus === 'needs_review' || rawStatus === 'flagged' || rawStatus === 'review') {
    status = 'needs_review';
  } else if (rawStatus === 'picked_up' || rawStatus === 'collected' || rawStatus === 'fulfilled') {
    status = 'picked_up';
  } else if (rawStatus === 'cancelled' || rawStatus === 'void') {
    status = 'cancelled';
  } else if (rawStatus === 'created') {
    status = 'created';
  }

  const totalPaise = Number(
    raw.totalPaise ??
      raw.total_paise ??
      raw.amountPaise ??
      (typeof raw.total === 'number' ? Math.round(raw.total * 100) : 0)
  );

  const expiresInSeconds = raw.expiresInSeconds ?? raw.expires_in_seconds ?? raw.expiresIn;

  return {
    id,
    status,
    totalPaise: isNaN(totalPaise) ? 0 : Math.round(totalPaise),
    expiresInSeconds: typeof expiresInSeconds === 'number' ? expiresInSeconds : undefined,
    items: Array.isArray(raw.items) ? raw.items : undefined,
    createdAt: raw.createdAt || raw.created_at,
    paidAt: raw.paidAt || raw.paid_at,
    pickedUpAt: raw.pickedUpAt || raw.picked_up_at,
    message: raw.message,
  };
}

/**
 * Formats user-facing API error messages.
 */
async function parseErrorResponse(response: Response): Promise<string> {
  let fallbackMessage = `Request failed with status ${response.status} (${response.statusText || 'Error'})`;

  if (response.status === 400) {
    fallbackMessage = 'Invalid order request. Please review your items and try again.';
  } else if (response.status === 409 || response.status === 422) {
    fallbackMessage = 'Insufficient inventory stock. Some snacks are no longer available in the requested quantity.';
  } else if (response.status === 404) {
    fallbackMessage = 'The requested resource was not found on the counter server.';
  } else if (response.status >= 500) {
    fallbackMessage = 'The counter backend server encountered an error or is currently unavailable.';
  }

  try {
    const json = await response.json();
    if (json && typeof json === 'object') {
      if (typeof json.message === 'string' && json.message.trim()) {
        return json.message;
      }
      if (typeof json.error === 'string' && json.error.trim()) {
        return json.error;
      }
      if (typeof json.detail === 'string' && json.detail.trim()) {
        return json.detail;
      }
    }
  } catch {
    // Response body is not JSON or cannot be read
  }

  return fallbackMessage;
}

/**
 * Pickup Counter API Client
 */
export const api = {
  /**
   * Fetches the real-time catalog of products from GET /products.
   */
  async getProducts(): Promise<Product[]> {
    const url = buildUrl('/products');

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (networkErr) {
      throw new Error(
        `Unable to reach backend server at ${url || window.location.origin}. Please ensure the Express backend is running and CORS is configured.`
      );
    }

    if (!response.ok) {
      const errorMsg = await parseErrorResponse(response);
      throw new Error(errorMsg);
    }

    const payload = await response.json();
    let rawList: any[] = [];

    if (Array.isArray(payload)) {
      rawList = payload;
    } else if (payload && Array.isArray(payload.products)) {
      rawList = payload.products;
    } else if (payload && Array.isArray(payload.data)) {
      rawList = payload.data;
    } else if (payload && Array.isArray(payload.items)) {
      rawList = payload.items;
    } else {
      throw new Error('Unexpected API response format from GET /products. Expected a list of products.');
    }

    return rawList.map((item, idx) => normalizeProduct(item, idx));
  },

  /**
   * Submits a new order to POST /orders.
   * Measures network round-trip time and records reception timestamp via performance.now().
   */
  async createOrder(
    payload: CreateOrderPayload
  ): Promise<ApiResponseMeta<CreateOrderResponse>> {
    const url = buildUrl('/orders');
    const startTimestamp = performance.now();

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      throw new Error(
        `Unable to submit order. Failed to reach counter server at ${url || window.location.origin}.`
      );
    }

    const endTimestamp = performance.now();
    const roundTripDelayMs = Math.round(endTimestamp - startTimestamp);

    if (!response.ok) {
      const errorMsg = await parseErrorResponse(response);
      throw new Error(errorMsg);
    }

    const json = await response.json();
    const data = normalizeCreateOrderResponse(json);

    if (!data.id) {
      throw new Error('Backend accepted order but did not return a valid order ID.');
    }

    return {
      data,
      receivedAt: performance.now(),
      roundTripDelayMs,
    };
  },

  /**
   * Polls the authoritative status of an order via GET /orders/:id.
   * Isolated endpoint path per specification.
   */
  async getOrderStatus(orderId: string): Promise<OrderDetails> {
    const url = buildUrl(`/orders/${encodeURIComponent(orderId)}`);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (networkErr) {
      throw new Error(`Connection lost while checking order status for #${orderId}.`);
    }

    if (!response.ok) {
      const errorMsg = await parseErrorResponse(response);
      throw new Error(errorMsg);
    }

    const json = await response.json();
    return normalizeOrderDetails(json);
  },

  /**
   * Optional order cancellation if supported by backend.
   */
  async cancelOrder(orderId: string): Promise<void> {
    const url = buildUrl(`/orders/${encodeURIComponent(orderId)}/cancel`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        // If 404 or 405, server may not support explicit cancel endpoint
        if (response.status !== 404 && response.status !== 405) {
          const errorMsg = await parseErrorResponse(response);
          throw new Error(errorMsg);
        }
      }
    } catch (err: any) {
      // Re-throw if critical
      if (err.message && !err.message.includes('404')) {
        throw err;
      }
    }
  },

  /**
   * Quick connection diagnostic to test backend connectivity.
   */
  async testConnection(): Promise<{ ok: boolean; status: number; message: string }> {
    const url = buildUrl('/products');
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return {
        ok: res.ok,
        status: res.status,
        message: res.ok ? 'Connection successful' : `Server responded with status ${res.status}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'Network connection failed',
      };
    }
  },
};
