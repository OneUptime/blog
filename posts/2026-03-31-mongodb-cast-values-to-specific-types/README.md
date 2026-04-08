# How to Cast Values to Specific Types in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Operator

Description: Learn how to cast values to specific BSON types in MongoDB aggregation using shorthand type operators and $convert for safe, controlled conversion.

---

Type casting in MongoDB aggregation ensures that values are interpreted as the correct BSON type before they are used in computations, comparisons, or stored as updated fields. Incorrect types cause silent bugs - a numeric string compared to a number never matches, for example.

## Why Casting Matters

MongoDB's flexible schema allows the same field to hold different types across documents. When aggregating data from imports, APIs, or legacy fields, you often need to normalize types before computing results:

```javascript
// A field might have both forms in the collection:
// { price: "29.99" }  <- string
// { price: 29.99 }    <- double
```

Arithmetic on the string version returns null.

## Casting to Integer

```javascript
db.inventory.aggregate([
  {
    $project: {
      sku: 1,
      quantity: { $toInt: "$rawQty" }
    }
  }
]);
```

`$toInt` truncates decimals: `$toInt: 4.9` returns `4`. For rounding, apply `$round` first.

## Casting to Double

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      price: { $toDouble: "$priceStr" }
    }
  }
]);
```

## Casting to Long (64-bit Integer)

Use `$toLong` for large integers or when converting BSON Dates to milliseconds:

```javascript
db.events.aggregate([
  {
    $project: {
      epochMs: { $toLong: "$timestamp" }  // Date -> milliseconds
    }
  }
]);
```

## Casting to Decimal (High-Precision)

For financial calculations requiring exact precision:

```javascript
db.transactions.aggregate([
  {
    $project: {
      amount: { $toDecimal: "$amountString" },
      fee: { $toDecimal: "$feeString" }
    }
  },
  {
    $project: {
      total: { $add: ["$amount", "$fee"] }
    }
  }
]);
```

`$toDecimal` produces a 128-bit decimal type, avoiding floating-point precision issues.

## Casting to String

Convert IDs, numbers, or dates to strings for concatenation or logging:

```javascript
db.orders.aggregate([
  {
    $project: {
      displayId: {
        $concat: ["ORDER-", { $toString: "$_id" }]
      }
    }
  }
]);
```

## Casting to Date

Convert epoch milliseconds or ISO strings to BSON Date:

```javascript
db.imports.aggregate([
  {
    $project: {
      createdAt: { $toDate: "$createdAtMs" },
      expiresAt: { $toDate: "$expiresAtIso" }
    }
  }
]);
```

`$toDate` accepts numbers (epoch ms) and ISO 8601 strings.

## Casting to ObjectId

Convert string IDs to ObjectId for use in `$lookup`:

```javascript
db.references.aggregate([
  {
    $addFields: {
      userId: { $toObjectId: "$userIdStr" }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userData"
    }
  }
]);
```

## Casting to Boolean

```javascript
db.settings.aggregate([
  {
    $project: {
      isEnabled: { $toBool: "$enabledFlag" }
    }
  }
]);
```

`$toBool` converts numeric zero to `false` and non-zero numbers to `true`. ObjectId and Date values always convert to `true`. Strings are not supported and cause errors; `null` input returns `null`.

## Safe Casting with $convert

When input validity is uncertain, use `$convert` with error handling:

```javascript
db.imports.aggregate([
  {
    $project: {
      safeQty: {
        $convert: {
          input: "$rawQty",
          to: "int",
          onError: 0,
          onNull: 0
        }
      }
    }
  }
]);
```

Shorthand operators like `$toInt` throw errors on invalid input; `$convert` lets you handle them gracefully.

## Summary

MongoDB's shorthand type operators (`$toInt`, `$toDouble`, `$toLong`, `$toDecimal`, `$toString`, `$toDate`, `$toObjectId`, `$toBool`) provide clean, readable casting. Use `$convert` when you need `onError` or `onNull` fallbacks. Cast early in pipelines to normalize types before they are used in arithmetic, comparisons, or `$group` keys.
