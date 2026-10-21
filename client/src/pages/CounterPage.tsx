/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { ProductCatalog } from '../components/ProductCatalog';
import { CartPanel } from '../components/CartPanel';
import { PaymentStatus } from '../components/PaymentStatus';
import { BackendSettingsModal } from '../components/BackendSettingsModal';
import { CartItem, CreateOrderResponse, Product } from '../types';
import { api } from '../services/api';

export const CounterPage: React.FC = () => {
  // Catalog state
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Active Order & Payment state
  const [activeOrderMeta, setActiveOrderMeta] = useState<{
    order: CreateOrderResponse;
    receivedAt: number;
    roundTripDelayMs: number;
  } | null>(null);

  // Backend settings & health state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  // Fetch product catalog
  const loadCatalog = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingCatalog(true);
    }
    setCatalogError(null);

    try {
      const list = await api.getProducts();
      setProducts(list);
      setIsBackendConnected(true);

      // Validate existing cart items against freshly retrieved stock
      setCartItems((prevItems) => {
        return prevItems
          .map((cartItem) => {
            const freshProduct = list.find((p) => p.id === cartItem.product.id);
            if (!freshProduct || freshProduct.availableUnits <= 0) {
              return null; // Product no longer in stock
            }
            return {
              ...cartItem,
              product: freshProduct,
              quantity: Math.min(cartItem.quantity, freshProduct.availableUnits),
            };
          })
          .filter((item): item is CartItem => item !== null && item.quantity > 0);
      });
    } catch (err: any) {
      setCatalogError(err?.message || 'Failed to connect to counter backend server.');
      setIsBackendConnected(false);
    } finally {
      setIsLoadingCatalog(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  // Cart Management Handlers
  const handleAddToCart = (product: Product) => {
    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item.product.id === product.id);
      if (existing) {
        // Enforce stock ceiling
        if (existing.quantity >= product.availableUnits) {
          return prevItems;
        }
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { productId: product.id, product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setCartItems((prevItems) => {
      return prevItems.map((item) => {
        if (item.product.id === productId) {
          const clamped = Math.min(newQuantity, item.product.availableUnits);
          return { ...item, quantity: clamped };
        }
        return item;
      });
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setOrderError(null);
  };

  const getCartQuantity = (productId: string): number => {
    const item = cartItems.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Submit Order to backend (POST /orders)
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || isSubmittingOrder) return;

    setIsSubmittingOrder(true);
    setOrderError(null);

    const payload = {
      items: cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    try {
      const response = await api.createOrder(payload);

      // Successfully reserved inventory on backend!
      setActiveOrderMeta({
        order: response.data,
        receivedAt: response.receivedAt,
        roundTripDelayMs: response.roundTripDelayMs,
      });

      // Clear cart tray
      setCartItems([]);
      setIsCartOpen(false);

      // Refresh catalog in background to reflect server-side inventory reservation
      void loadCatalog(true);
    } catch (err: any) {
      setOrderError(err?.message || 'Failed to place order with backend.');
      // Keep cart intact so customer can retry
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <Header
        totalCartItems={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onRefreshCatalog={() => void loadCatalog(true)}
        isRefreshing={isRefreshing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* If an active order is being tracked, display Payment Status */}
        {activeOrderMeta ? (
          <div>
            <PaymentStatus
              order={activeOrderMeta.order}
              responseReceivedAt={activeOrderMeta.receivedAt}
              roundTripDelayMs={activeOrderMeta.roundTripDelayMs}
              onNewOrder={() => {
                setActiveOrderMeta(null);
                void loadCatalog(true);
              }}
              onOrderCancelled={() => {
                void loadCatalog(true);
              }}
            />
          </div>
        ) : (
          /* Main Product Catalog Display */
          <ProductCatalog
            products={products}
            isLoading={isLoadingCatalog}
            error={catalogError}
            onRefresh={() => void loadCatalog(true)}
            onAddToCart={handleAddToCart}
            getCartQuantity={getCartQuantity}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      {/* Shopping Cart Drawer */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onCheckout={handlePlaceOrder}
        isSubmittingOrder={isSubmittingOrder}
        submitError={orderError}
      />

      {/* Backend Settings & Endpoint Modal */}
      <BackendSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => void loadCatalog(true)}
      />

      {/* Subtle Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Pickup Counter. Self-Service Snack Terminal.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Authoritative UPI Webhook Simulation</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="text-slate-600 hover:text-emerald-700 underline underline-offset-2 cursor-pointer"
            >
              API Endpoint Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
