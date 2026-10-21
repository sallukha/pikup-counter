/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(express.json());

// Enable CORS for cross-port development (e.g. Frontend on 3000 -> Backend on 4000)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// In-Memory Inventory Database
interface ProductModel {
  id: string;
  name: string;
  pricePaise: number;
  availableUnits: number;
  category: string;
  description: string;
}

let products: ProductModel[] = [
  {
    id: 'prod-chips-salted',
    name: 'Artisan Potato Chips',
    pricePaise: 2000, // ₹20.00
    availableUnits: 14,
    category: 'Chips & Crisps',
    description: 'Thinly sliced sea salt kettle-cooked artisan crisps.',
  },
  {
    id: 'prod-masala-peanuts',
    name: 'Spicy Masala Peanuts',
    pricePaise: 1500, // ₹15.00
    availableUnits: 18,
    category: 'Peanuts & Nuts',
    description: 'Crunchy golden roasted peanuts coated with chili & cumin.',
  },
  {
    id: 'prod-dark-chocolate',
    name: 'Dark Chocolate Bar (70%)',
    pricePaise: 4000, // ₹40.00
    availableUnits: 8,
    category: 'Sweets & Chocolates',
    description: 'Single-origin artisanal dark chocolate with roasted cocoa nibs.',
  },
  {
    id: 'prod-sparkling-soda',
    name: 'Chilled Sparkling Lime Soda',
    pricePaise: 3000, // ₹30.00
    availableUnits: 12,
    category: 'Beverages',
    description: 'Crisp sparkling botanical soda with freshly squeezed lime.',
  },
  {
    id: 'prod-nachos-salsa',
    name: 'Baked Tortilla Chips & Salsa',
    pricePaise: 3500, // ₹35.00
    availableUnits: 6,
    category: 'Chips & Crisps',
    description: 'Stone-ground baked corn nachos with tangy roasted tomato salsa.',
  },
  {
    id: 'prod-roasted-cashews',
    name: 'Roasted Pepper Cashews',
    pricePaise: 5000, // ₹50.00
    availableUnits: 5,
    category: 'Peanuts & Nuts',
    description: 'Whole jumbo cashews slow-roasted with crushed Tellicherry pepper.',
  },
  {
    id: 'prod-butter-popcorn',
    name: 'Warm Theater Butter Popcorn',
    pricePaise: 2500, // ₹25.00
    availableUnits: 0, // Intentionally 0 to test out-of-stock handling
    category: 'Chips & Crisps',
    description: 'Freshly popped fluffy kernels tossed in real melted butter.',
  },
];

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  pricePaise: number;
}

interface OrderRecord {
  id: string;
  items: OrderItem[];
  totalPaise: number;
  status: 'pending' | 'paid' | 'expired' | 'needs_review' | 'picked_up' | 'cancelled';
  expiresInSeconds: number;
  createdAt: number; // Date.now()
  paidAt?: string;
  inventoryReleased?: boolean;
}

const orders = new Map<string, OrderRecord>();

// Helper to check order expiration and release stock
function checkAndExpireOrder(order: OrderRecord) {
  if (order.status === 'pending') {
    const elapsedSeconds = (Date.now() - order.createdAt) / 1000;
    if (elapsedSeconds >= order.expiresInSeconds) {
      order.status = 'expired';
      // Release reserved inventory
      if (!order.inventoryReleased) {
        for (const item of order.items) {
          const prod = products.find((p) => p.id === item.productId);
          if (prod) {
            prod.availableUnits += item.quantity;
          }
        }
        order.inventoryReleased = true;
      }
    }
  }
}

// Periodic check to auto-expire orders every 5 seconds
setInterval(() => {
  for (const order of orders.values()) {
    checkAndExpireOrder(order);
  }
}, 5000);

/**
 * GET /products
 * Returns the current snack catalog and available stock.
 */
app.get('/products', (_req: Request, res: Response) => {
  res.json(products);
});

/**
 * POST /orders
 * Creates a new order, calculates authoritative total, and reserves inventory.
 */
app.post('/orders', (req: Request, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Order must include at least one item.' });
    return;
  }

  // Verify product existence and stock availability
  const orderItems: OrderItem[] = [];
  let calculatedTotalPaise = 0;

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      res.status(400).json({ error: `Invalid product ID: ${item.productId}` });
      return;
    }

    const requestedQty = Number(item.quantity);
    if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
      res.status(400).json({ error: `Invalid quantity for product ${product.name}` });
      return;
    }

    if (requestedQty > product.availableUnits) {
      res.status(409).json({
        error: `Insufficient stock for ${product.name}. Available: ${product.availableUnits}, requested: ${requestedQty}`,
      });
      return;
    }

    orderItems.push({
      productId: product.id,
      name: product.name,
      quantity: requestedQty,
      pricePaise: product.pricePaise,
    });

    calculatedTotalPaise += product.pricePaise * requestedQty;
  }

  // Reserve inventory
  for (const item of orderItems) {
    const product = products.find((p) => p.id === item.productId)!;
    product.availableUnits -= item.quantity;
  }

  const orderId = `ord_${Math.random().toString(36).substring(2, 9)}`;
  const expiresInSeconds = 120; // 2 minutes window

  const newOrder: OrderRecord = {
    id: orderId,
    items: orderItems,
    totalPaise: calculatedTotalPaise,
    status: 'pending',
    expiresInSeconds,
    createdAt: Date.now(),
  };

  orders.set(orderId, newOrder);

  // Return authoritative order response
  res.status(201).json({
    id: orderId,
    totalPaise: calculatedTotalPaise,
    expiresInSeconds,
    status: 'pending',
    createdAt: new Date(newOrder.createdAt).toISOString(),
  });
});

/**
 * GET /orders/:id
 * Polls the current status of an order.
 */
app.get('/orders/:id', (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  checkAndExpireOrder(order);

  const remainingSeconds = Math.max(
    0,
    order.expiresInSeconds - Math.floor((Date.now() - order.createdAt) / 1000)
  );

  res.json({
    id: order.id,
    status: order.status,
    totalPaise: order.totalPaise,
    expiresInSeconds: remainingSeconds,
    items: order.items,
    createdAt: new Date(order.createdAt).toISOString(),
    paidAt: order.paidAt,
  });
});

/**
 * POST /orders/:id/cancel
 * Cancels an order and releases reserved inventory.
 */
app.post('/orders/:id/cancel', (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  if (order.status === 'paid') {
    res.status(400).json({ error: 'Cannot cancel an order that has already been paid.' });
    return;
  }

  if (order.status !== 'cancelled' && order.status !== 'expired') {
    order.status = 'cancelled';
    if (!order.inventoryReleased) {
      for (const item of order.items) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.availableUnits += item.quantity;
        }
      }
      order.inventoryReleased = true;
    }
  }

  res.json({ message: 'Order cancelled successfully', status: order.status });
});

/**
 * POST /webhooks/payment
 * Simulated payment confirmation webhook.
 * Expected payload: { orderId: string, status?: 'paid' | 'needs_review' }
 */
app.post('/webhooks/payment', (req: Request, res: Response) => {
  const { orderId, status = 'paid' } = req.body;

  if (!orderId) {
    res.status(400).json({ error: 'Missing orderId in webhook payload.' });
    return;
  }

  const order = orders.get(orderId);
  if (!order) {
    res.status(404).json({ error: `Order #${orderId} not found.` });
    return;
  }

  checkAndExpireOrder(order);

  if (order.status === 'expired') {
    res.status(400).json({ error: 'Order has already expired. Payment cannot be accepted.' });
    return;
  }

  if (status === 'needs_review') {
    order.status = 'needs_review';
  } else {
    order.status = 'paid';
    order.paidAt = new Date().toISOString();
  }

  res.json({
    message: 'Webhook processed successfully',
    orderId: order.id,
    status: order.status,
  });
});

// Serve frontend build static files in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // If index.html isn't built yet, respond with API info
      res.json({
        name: 'Pickup Counter API Server',
        status: 'online',
        endpoints: ['GET /products', 'POST /orders', 'GET /orders/:id', 'POST /webhooks/payment'],
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Pickup Counter] Express backend listening on http://localhost:${PORT}`);
});
