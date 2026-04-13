# How to Model Promotional Codes and Discounts in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Schema, Promotion, E-Commerce

Description: Learn how to model promotional codes and discount rules in MongoDB, enforce usage limits, and apply discounts safely during checkout using transactions.

---

## Promo Code Document Structure

A promo code document needs to capture the discount type, applicable scope, validity window, usage limits, and usage tracking:

```javascript
{
  _id: ObjectId("..."),
  code: "SUMMER25",
  type: "percentage",        // "percentage" | "fixed" | "free_shipping"
  value: 25,                 // 25% off
  minOrderAmount: 50.00,
  maxDiscount: 100.00,       // cap on percentage discounts
  applicableTo: {
    categories: ["apparel", "footwear"],
    productIds: [],           // empty = all products in categories
    excludedProductIds: []
  },
  validity: {
    startDate: ISODate("2026-06-01T00:00:00Z"),
    endDate:   ISODate("2026-06-30T23:59:59Z")
  },
  usageLimit: {
    totalUses:     1000,      // max uses across all customers
    usesPerCustomer: 1        // max uses per customer
  },
  usageCount: 412,
  active: true,
  createdAt: ISODate("2026-05-25T00:00:00Z")
}
```

## Unique Index on Code

Prevent duplicate promo codes at the database level:

```javascript
db.promoCodes.createIndex({ code: 1 }, { unique: true });
db.promoCodes.createIndex({ "validity.endDate": 1 }, { expireAfterSeconds: 0 });
```

The TTL index on `validity.endDate` can be used to auto-remove expired codes by having MongoDB delete documents once the date has passed.

## Tracking Per-Customer Usage

Store per-customer redemptions in a separate `promoRedemptions` collection:

```javascript
{
  _id: ObjectId("..."),
  promoCode: "SUMMER25",
  customerId: ObjectId("..."),
  orderId: ObjectId("..."),
  discountApplied: 32.50,
  redeemedAt: ISODate("2026-06-10T15:00:00Z")
}
```

Create a compound unique index to enforce the per-customer limit:

```javascript
db.promoRedemptions.createIndex(
  { promoCode: 1, customerId: 1 },
  { unique: true }
);
```

## Validating and Applying a Promo Code

```javascript
async function applyPromoCode(session, code, customerId, orderAmount, items) {
  const promo = await db.promoCodes.findOne({ code, active: true }, { session });
  if (!promo) throw new Error("Invalid promo code");

  const now = new Date();
  if (now < promo.validity.startDate || now > promo.validity.endDate) {
    throw new Error("Promo code has expired");
  }
  if (orderAmount < promo.minOrderAmount) {
    throw new Error(`Minimum order amount is ${promo.minOrderAmount}`);
  }
  if (promo.usageCount >= promo.usageLimit.totalUses) {
    throw new Error("Promo code has reached its usage limit");
  }

  // Check per-customer usage (unique index will also catch duplicates)
  const existing = await db.promoRedemptions.findOne(
    { promoCode: code, customerId }, { session }
  );
  if (existing) throw new Error("You have already used this promo code");

  // Increment usage count atomically
  const result = await db.promoCodes.updateOne(
    { code, usageCount: { $lt: promo.usageLimit.totalUses } },
    { $inc: { usageCount: 1 } },
    { session }
  );
  if (result.modifiedCount === 0) throw new Error("Promo code no longer available");

  // Record the redemption for per-customer tracking
  await db.promoRedemptions.insertOne(
    { promoCode: code, customerId, orderId: null, discountApplied: calculateDiscount(promo, orderAmount), redeemedAt: new Date() },
    { session }
  );

  return calculateDiscount(promo, orderAmount);
}
```

## Calculating the Discount

```javascript
function calculateDiscount(promo, orderAmount) {
  if (promo.type === "percentage") {
    const raw = orderAmount * (promo.value / 100);
    return Math.min(raw, promo.maxDiscount || Infinity);
  }
  if (promo.type === "fixed") {
    return Math.min(promo.value, orderAmount);
  }
  if (promo.type === "free_shipping") {
    return 0; // handled separately in shipping calc
  }
}
```

## Summary

Modeling promotional codes in MongoDB requires a `promoCodes` collection with discount type, value, validity dates, and usage limits, plus a `promoRedemptions` collection with a unique compound index on `(promoCode, customerId)` to enforce per-customer limits. Use `$inc` with a conditional filter to atomically increment usage counts and prevent over-redemption, and run the entire promo validation and order insertion inside a transaction.
