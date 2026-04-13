# How to Use the $ Positional Operator to Update Matched Array Elements in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Database, Array

Description: Learn how MongoDB's $ positional operator updates the first array element that matches your query filter without needing to know its index.

---

When you need to update a specific element inside a MongoDB array, you typically don't know the element's index ahead of time. The `$` positional operator solves this by acting as a placeholder for the first array element that matches the query condition.

## How It Works

The `$` operator captures the index of the matched array element from the query filter and applies the update at that position. The key rule: the array field must appear in the query filter.

```javascript
db.collection.updateOne(
  { "arrayField.subField": matchValue },
  { $set: { "arrayField.$.subField": newValue } }
)
```

## Updating a Matched Element in an Array of Objects

A shopping cart stores items as an array. Update the quantity of a specific product:

```javascript
db.carts.updateOne(
  { userId: "u_42", "items.productId": "prod_99" },
  { $set: { "items.$.quantity": 3 } }
)
```

The `$` resolves to the index of the item where `productId` equals `"prod_99"`.

## Updating Multiple Fields of a Matched Element

Use `$set` with multiple dot-notation paths to update several sub-fields at once:

```javascript
db.orders.updateOne(
  { _id: ObjectId("64a1b2c3d4e5f6a7b8c9d0e1"), "lineItems.sku": "ABC-001" },
  {
    $set: {
      "lineItems.$.price": 19.99,
      "lineItems.$.discounted": true
    }
  }
)
```

## Incrementing a Value in a Matched Element

Combine `$` with `$inc` to increment a matched element's numeric field:

```javascript
db.games.updateOne(
  { _id: "game_7", "players.name": "Alice" },
  { $inc: { "players.$.score": 10 } }
)
```

## Limitation: Only Updates the First Match

The `$` operator updates only the **first** matching array element. If multiple elements match the filter, only the first one is modified.

```javascript
// Only the first element with status "pending" gets updated
db.tasks.updateOne(
  { projectId: "proj_1", "steps.status": "pending" },
  { $set: { "steps.$.status": "in-progress" } }
)
```

To update all matching elements, use `$[identifier]` with `arrayFilters` instead.

## Combining with $push and $pull

The positional operator works with other array operators too:

```javascript
// Push a tag into the matching item's tags array
db.inventory.updateOne(
  { "products.id": "p_55" },
  { $push: { "products.$.tags": "clearance" } }
)
```

## Nested Arrays

The `$` operator does not support nested arrays (arrays within arrays). For nested updates, use `$[identifier]` with `arrayFilters`.

```javascript
// This does NOT work for nested arrays
db.boards.updateOne(
  { "columns.cards.id": "card_3" },
  { $set: { "columns.$.cards.$.done": true } }  // invalid
)
```

## Summary

The `$` positional operator is the standard way to update the first array element that satisfies a query condition. It avoids hardcoding element indexes and works seamlessly with `$set`, `$inc`, `$push`, and other update operators. For updating all matching elements or handling nested arrays, consider `$[]` and `$[identifier]` with `arrayFilters`.
