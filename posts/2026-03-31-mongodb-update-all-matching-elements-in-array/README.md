# How to Update All Matching Elements in an Array in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update, Array, Positional Operator, Operator

Description: Learn how to update all array elements matching a condition in MongoDB using the $[identifier] filtered positional operator with arrayFilters.

---

MongoDB's `$` positional operator only updates the first matching array element. To update all array elements that satisfy a condition in a single operation, use the filtered positional operator `$[identifier]` with the `arrayFilters` option.

## The $[identifier] Syntax

The `$[identifier]` syntax consists of:
- `$[identifier]` in the update path - a placeholder for matching elements
- `arrayFilters` option - specifies the condition that matching elements must meet

```javascript
db.orders.updateOne(
  { _id: orderId },
  { $set: { "items.$[item].status": "shipped" } },
  {
    arrayFilters: [{ "item.status": "pending" }]
  }
)
```

This updates all elements in `items` where `status` is `"pending"`.

## Sample Data

```javascript
db.orders.insertOne({
  _id: 1,
  items: [
    { sku: "A100", status: "pending", qty: 2 },
    { sku: "B200", status: "pending", qty: 1 },
    { sku: "C300", status: "shipped", qty: 3 }
  ]
})
```

## Update All Pending Items to Shipped

```javascript
db.orders.updateOne(
  { _id: 1 },
  { $set: { "items.$[item].status": "shipped" } },
  { arrayFilters: [{ "item.status": "pending" }] }
)
// Updates A100 and B200, leaves C300 unchanged
```

## Using $[] to Update All Elements (No Condition)

`$[]` updates every element in the array unconditionally:

```javascript
// Mark all items in order as reviewed
db.orders.updateOne(
  { _id: 1 },
  { $set: { "items.$[].reviewed": true } }
)
```

## Numeric Condition in arrayFilters

```javascript
// Apply a 10% discount to all items priced over $50
db.orders.updateMany(
  {},
  { $mul: { "items.$[item].price": 0.9 } },
  { arrayFilters: [{ "item.price": { $gt: 50 } }] }
)
```

## Multiple arrayFilters for Different Identifiers

You can use multiple identifiers for nested arrays:

```javascript
db.schedules.updateOne(
  { _id: scheduleId },
  {
    $set: { "weeks.$[week].days.$[day].available": false }
  },
  {
    arrayFilters: [
      { "week.weekNumber": { $gte: 3 } },
      { "day.dayOfWeek": { $in: ["Saturday", "Sunday"] } }
    ]
  }
)
```

## Incrementing a Numeric Field on All Matching Elements

```javascript
// Add 5 qty to all pending items across all orders
db.orders.updateMany(
  {},
  { $inc: { "items.$[item].qty": 5 } },
  { arrayFilters: [{ "item.status": "pending" }] }
)
```

## Verify Results

```javascript
const result = await db.collection("orders").updateOne(
  { _id: 1 },
  { $set: { "items.$[item].status": "shipped" } },
  { arrayFilters: [{ "item.status": "pending" }] }
);

console.log(`Modified: ${result.modifiedCount}`);

// Confirm the update
const updated = await db.collection("orders").findOne({ _id: 1 });
console.log(updated.items.map(i => i.status));
// ["shipped", "shipped", "shipped"]
```

## Summary

Use `$[identifier]` with `arrayFilters` to update all array elements matching a condition in a single atomic operation. Use `$[]` (without an identifier) to update every element in the array unconditionally. Multiple identifiers let you target elements in nested arrays. These operators work with `updateOne`, `updateMany`, and `findOneAndUpdate`, and support all field update operators including `$set`, `$inc`, and `$unset`.
