/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  pricePaise: number;
  availableUnits: number;
  imageUrl?: string;
  category?: string;
  description?: string;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  items: CreateOrderItemPayload[];
}

export type OrderStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'expired'
  | 'needs_review'
  | 'picked_up'
  | 'cancelled';

export interface CreateOrderResponse {
  id: string;
  totalPaise: number;
  expiresInSeconds: number;
  status?: OrderStatus;
  createdAt?: string;
}

export interface OrderItemDetails {
  productId: string;
  name?: string;
  quantity: number;
  pricePaise?: number;
}

export interface OrderDetails {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  expiresInSeconds?: number;
  items?: OrderItemDetails[];
  createdAt?: string;
  paidAt?: string;
  pickedUpAt?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

export interface ApiResponseMeta<T> {
  data: T;
  receivedAt: number; // captured with performance.now()
  roundTripDelayMs: number;
}
