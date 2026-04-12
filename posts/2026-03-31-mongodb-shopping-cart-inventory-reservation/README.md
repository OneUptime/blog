# How to Model Shopping Cart with Inventory Reservation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, E-Commerce, Shopping Cart, Inventory, Schema Design

Description: Design a MongoDB shopping cart with inventory reservation to prevent overselling, handle cart expiration, and ensure consistent checkout using atomic operations.

---

## The Cart and Inventory Challenge

Shopping carts that don't reserve inventory risk overselling: two customers add the last item to their carts, both proceed to checkout, and only one gets it. Proper inventory reservation requires atomic operations and expiration-based cleanup for abandoned carts.

## Cart Document Schema

```javascript
{
  _id: "cart_abc123",
  customerId: "cust_456",        // null for guest carts
  sessionId: "sess_xyz",

  items: [
    {
      productId: "prod_001",
      variantSku: "TCT-M-RED",
      name: "Classic Cotton T-Shirt - M / Red",
      quantity: 2,
      unitPrice: 2499,
      reservedAt: ISODate("2026-03-31T10:00:00Z"),
      reservationExpiry: ISODate("2026-03-31T10:30:00Z")
    }
  ],

  subtotal: 4998,
  status: "active",             // active | checkout | converted | abandoned | expired

  createdAt: ISODate("2026-03-31T09:55:00Z"),
  updatedAt: ISODate("2026-03-31T10:00:00Z"),
  expiresAt: ISODate("2026-03-31T11:00:00Z")  // For TTL cleanup
}
```

## Inventory Document Schema

```javascript
// inventory collection - tracks available and reserved stock
{
  _id: "TCT-M-RED",             // variantSku as _id for atomic updates
  productId: "prod_001",
  price: 2499,                   // Unit price in cents
  available: 10,
  reserved: 2,                   // Currently held in active carts
  total: 12
}
```

## Adding an Item to Cart with Reservation

The key is to atomically decrement available inventory while adding to the cart:

```javascript
async function addToCart(cartId, productId, variantSku, quantity) {
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      // Step 1: Reserve inventory atomically
      const invResult = await db.collection("inventory").findOneAndUpdate(
        {
          _id: variantSku,
          available: { $gte: quantity }   // Guard: must have enough stock
        },
        {
          $inc: { available: -quantity, reserved: quantity }
        },
        { session, returnDocument: "after" }
      );

      if (!invResult) {
        throw new Error("Insufficient inventory");
      }

      const reservationExpiry = new Date(Date.now() + 30 * 60 * 1000);  // 30 min

      // Step 2: Add item to cart
      await db.collection("carts").updateOne(
        { _id: cartId },
        {
          $push: {
            items: {
              productId,
              variantSku,
              quantity,
              unitPrice: invResult.price,
              reservedAt: new Date(),
              reservationExpiry
            }
          },
          $set: { updatedAt: new Date() }
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}
```

## Releasing Reservations When Items are Removed

```javascript
async function removeFromCart(cartId, variantSku, quantity) {
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      // Remove from cart
      await db.collection("carts").updateOne(
        { _id: cartId },
        { $pull: { items: { variantSku } } },
        { session }
      );

      // Release the reservation
      await db.collection("inventory").updateOne(
        { _id: variantSku },
        { $inc: { available: quantity, reserved: -quantity } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}
```

## Cart Expiration with TTL Index

Use a TTL index to automatically delete expired carts:

```javascript
db.carts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

MongoDB TTL deletions have no pre-delete hooks, so a background job must find and release inventory for expired carts before TTL removes them:

```javascript
const expiredCarts = await db.collection("carts").find({
  status: "active",
  expiresAt: { $lte: new Date() }
}).toArray();

for (const cart of expiredCarts) {
  for (const item of cart.items) {
    await db.collection("inventory").updateOne(
      { _id: item.variantSku },
      { $inc: { available: item.quantity, reserved: -item.quantity } }
    );
  }
  await db.collection("carts").deleteOne({ _id: cart._id });
}
```

## Converting Cart to Order

```javascript
async function checkout(cartId, paymentData) {
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const cart = await db.collection("carts").findOneAndUpdate(
        { _id: cartId, status: "active" },
        { $set: { status: "converted" } },
        { session, returnDocument: "before" }
      );

      if (!cart) {
        throw new Error("Cart not found or not active");
      }

      // Convert reserved inventory to sold
      for (const item of cart.items) {
        await db.collection("inventory").updateOne(
          { _id: item.variantSku },
          { $inc: { reserved: -item.quantity, total: -item.quantity } },
          { session }
        );
      }

      // Create order
      await db.collection("orders").insertOne(
        { cartId, items: cart.items, ...paymentData },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}
```

## Summary

Shopping cart inventory reservation in MongoDB uses atomic `findOneAndUpdate` operations with stock guards to simultaneously reserve inventory and add items to the cart within a transaction. The `available` and `reserved` fields on inventory documents track exactly how much stock is free vs. held. Cart expiration via TTL indexes handles abandoned carts, but you must release inventory reservations before deletion. At checkout, convert reserved inventory to sold by decrementing `reserved` and `total` atomically with order creation.
