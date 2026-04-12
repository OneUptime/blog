# How to Use $$REMOVE to Conditionally Exclude Fields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Variable

Description: Learn how to use $$REMOVE in MongoDB aggregation to conditionally omit fields from documents based on runtime conditions.

---

In MongoDB aggregation, setting a field to `null` and omitting a field are different outcomes. `$$REMOVE` is a system variable that, when assigned as a field's value, instructs MongoDB to omit that field from the output document entirely - not set it to null.

## The Problem $$REMOVE Solves

Without `$$REMOVE`, you would have to set the field to a sentinel value such as `null`:

```javascript
// Without $$REMOVE: ssn is set to null for non-admins, not omitted
db.users.aggregate([
  {
    $addFields: {
      ssn: { $cond: [{ $eq: ["$role", "admin"] }, "$ssn", null] }
    }
  }
]);
```

With `$$REMOVE`, you can correctly omit the field entirely rather than setting it to `null` or a placeholder value.

## Basic $$REMOVE Usage

```javascript
db.users.aggregate([
  {
    $addFields: {
      ssn: {
        $cond: {
          if: { $eq: ["$role", "admin"] },
          then: "$ssn",
          else: "$$REMOVE"
        }
      }
    }
  }
]);
```

For non-admin documents, `ssn` is entirely absent from output. For admin documents, `ssn` is present with its original value.

## $$REMOVE vs. Setting to Null

The distinction matters when:
- Downstream code checks for field existence vs. null
- You are building API responses where absent fields mean "not applicable"
- You want smaller documents without placeholder nulls

```javascript
// null: { name: "Bob", sensitiveField: null }
// $$REMOVE: { name: "Bob" }    <- field not present at all
```

## Conditional Field Set Based on Multiple Conditions

```javascript
db.orders.aggregate([
  {
    $addFields: {
      internalNotes: {
        $cond: {
          if: {
            $and: [
              { $eq: ["$status", "flagged"] },
              { $eq: ["$userRole", "admin"] }
            ]
          },
          then: "$internalNotes",
          else: "$$REMOVE"
        }
      },
      costBasis: {
        $cond: {
          if: { $eq: ["$userRole", "finance"] },
          then: "$costBasis",
          else: "$$REMOVE"
        }
      }
    }
  }
]);
```

## Using $$REMOVE in $project

`$$REMOVE` also works in `$project`:

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      price: 1,
      costPrice: {
        $cond: {
          if: "$showCostToUser",
          then: "$costPrice",
          else: "$$REMOVE"
        }
      }
    }
  }
]);
```

## Stripping Null Fields from Documents

Combine `$objectToArray`, `$filter`, and `$arrayToObject` to remove all null fields at once (a pattern that effectively uses the `$$REMOVE` concept via reconstruction):

```javascript
db.products.aggregate([
  {
    $replaceWith: {
      $arrayToObject: {
        $filter: {
          input: { $objectToArray: "$$ROOT" },
          as: "field",
          cond: { $ne: ["$$field.v", null] }
        }
      }
    }
  }
]);
```

For field-by-field conditional exclusion, `$$REMOVE` is cleaner.

## $$REMOVE in Array Transformation

Remove array elements by returning `$$REMOVE` is not supported - for arrays, use `$filter`. `$$REMOVE` only works for top-level field assignment in `$addFields` and `$project`.

## Summary

`$$REMOVE` is the idiomatic way to conditionally exclude fields from aggregation output. Assign it as the value of a field inside `$cond` (or `$switch`) in `$addFields` or `$project` stages. Unlike setting a field to `null`, `$$REMOVE` completely omits the key from the output document, producing cleaner, more accurate results.
