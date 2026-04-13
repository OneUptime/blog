# How to Use $[identifier] with arrayFilters to Update Array Elements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array Updates, arrayFilter, Update Operator, NoSQL

Description: Learn how to use MongoDB's $[identifier] positional operator with arrayFilters to conditionally update specific elements within arrays based on criteria.

---

## What Is the $[identifier] Operator?

The `$[identifier]` filtered positional operator updates all array elements that match conditions specified in the `arrayFilters` option. This allows surgical updates to specific array elements without knowing their index position.

```javascript
db.collection.updateOne(
  { filter },
  { $set: { "arrayField.$[elem].subField": newValue } },
  { arrayFilters: [{ "elem.condition": value }] }
)
```

The `identifier` (e.g., `elem`) is a placeholder name you choose - it links the update expression to the corresponding filter in `arrayFilters`.

## Basic Example

Given an `orders` collection:

```javascript
{
  _id: 1,
  items: [
    { sku: "A", qty: 5, status: "pending" },
    { sku: "B", qty: 3, status: "pending" },
    { sku: "C", qty: 8, status: "shipped" }
  ]
}
```

Update only the "pending" items to "processing":

```javascript
db.orders.updateOne(
  { _id: 1 },
  { $set: { "items.$[item].status": "processing" } },
  { arrayFilters: [{ "item.status": "pending" }] }
)
```

Result: both sku A and B have their status updated; sku C (already "shipped") is unchanged.

## Multiple Conditions in arrayFilters

You can specify multiple conditions per filter:

```javascript
db.orders.updateOne(
  { _id: 1 },
  { $set: { "items.$[item].discounted": true } },
  {
    arrayFilters: [{
      "item.qty": { $gte: 5 },
      "item.status": "pending"
    }]
  }
)
```

Only items with `qty >= 5` AND `status: "pending"` get the `discounted: true` field.

## Updating Nested Arrays

For nested arrays, use multiple identifiers:

```javascript
{
  _id: 1,
  departments: [
    {
      name: "Engineering",
      employees: [
        { name: "Alice", level: 3 },
        { name: "Bob", level: 2 }
      ]
    }
  ]
}
```

```javascript
db.company.updateOne(
  { _id: 1 },
  { $inc: { "departments.$[dept].employees.$[emp].level": 1 } },
  {
    arrayFilters: [
      { "dept.name": "Engineering" },
      { "emp.level": { $lt: 3 } }
    ]
  }
)
```

This increments the level of all Engineering employees with level < 3.

## Using updateMany with arrayFilters

Apply the filter across multiple documents:

```javascript
db.orders.updateMany(
  { status: "active" },
  { $set: { "items.$[item].flagged": true } },
  { arrayFilters: [{ "item.price": { $gt: 1000 } }] }
)
```

## Practical Use Case - Grade Adjustment

Bump all grades below 60 to 60 for a specific course:

```javascript
db.students.updateMany(
  {},
  { $max: { "grades.$[grade].score": 60 } },
  { arrayFilters: [{ "grade.course": "CS101", "grade.score": { $lt: 60 } }] }
)
```

## Practical Use Case - Inventory Updates

Mark specific items as restocked:

```javascript
db.warehouses.updateMany(
  { region: "West" },
  {
    $set: { "inventory.$[item].status": "available" },
    $inc: { "inventory.$[item].quantity": 100 }
  },
  { arrayFilters: [{ "item.sku": { $in: ["SKU-A", "SKU-B"] }, "item.status": "out_of_stock" }] }
)
```

## Difference from $ (Positional Operator)

The basic `$` positional operator updates only the first matching element. `$[identifier]` with `arrayFilters` updates all matching elements:

```javascript
// $: Updates FIRST matching element
db.orders.updateOne(
  { "items.status": "pending" },
  { $set: { "items.$.status": "processing" } }
)

// $[identifier]: Updates ALL matching elements
db.orders.updateOne(
  { _id: 1 },
  { $set: { "items.$[item].status": "processing" } },
  { arrayFilters: [{ "item.status": "pending" }] }
)
```

## Naming Rules for Identifiers

- Must start with a lowercase letter
- Can contain only alphanumeric characters
- Cannot be an empty string

## Summary

The `$[identifier]` operator with `arrayFilters` enables precise, conditional updates to multiple array elements that match specified criteria. It is more powerful and flexible than the basic positional `$` operator, supporting complex conditions, multiple identifiers for nested arrays, and bulk updates across entire collections.
