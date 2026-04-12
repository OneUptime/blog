# How to Remove Specific Fields from a Document in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Document, Update

Description: Learn how to remove specific fields from MongoDB documents using $unset in updates, $project exclusion, and $$REMOVE in aggregation pipelines.

---

Removing fields from documents is a routine operation - cleaning up deprecated fields, redacting sensitive data, or normalizing schema. MongoDB provides different tools for in-query projection, permanent removal in updates, and conditional removal in aggregation.

## Removing Fields with $unset in Updates

The `$unset` update operator permanently removes a field from stored documents:

```javascript
// Remove a single field
db.users.updateMany(
  {},
  { $unset: { legacyField: "" } }
);

// Remove multiple fields
db.users.updateMany(
  {},
  { $unset: { legacyField: "", deprecatedFlag: "", tempCache: "" } }
);
```

The value `""` is conventional but any value works - `$unset` ignores the value and removes the key. This change is permanent.

## Excluding Fields in Query Projection

To exclude fields from query results without modifying stored data, use projection exclusion:

```javascript
// Return all fields except password and internalNotes
db.users.find(
  { status: "active" },
  { password: 0, internalNotes: 0 }
);
```

You cannot mix inclusion (`1`) and exclusion (`0`) in the same projection, except for `_id`.

## Removing Nested Fields

Use dot notation for nested field removal:

```javascript
// Remove a nested field with $unset
db.users.updateMany(
  {},
  { $unset: { "profile.ssn": "", "billing.cvv": "" } }
);

// Exclude nested fields in projection
db.users.find({}, { "profile.ssn": 0, "billing.cvv": 0 });
```

## Using $project to Exclude Fields in Aggregation

In an aggregation pipeline, set a field to `0` in `$project` to exclude it:

```javascript
db.users.aggregate([
  { $match: { status: "active" } },
  {
    $project: {
      password: 0,
      internalNotes: 0,
      __v: 0
    }
  }
]);
```

## $$REMOVE for Conditional Field Removal in Aggregation

`$$REMOVE` is a system variable that signals MongoDB to exclude a field when used as a field value in `$addFields` or `$project`. This enables conditional removal:

```javascript
db.users.aggregate([
  {
    $addFields: {
      // Remove "internalNotes" for non-admin users
      internalNotes: {
        $cond: {
          if: { $eq: ["$role", "admin"] },
          then: "$internalNotes",
          else: "$$REMOVE"
        }
      }
    }
  }
]);
```

When `role` is not `"admin"`, `internalNotes` is omitted from the output document entirely.

## Removing Fields Based on Value

Remove fields that have a null value by converting the document to key-value pairs, filtering, and reconstructing:

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

This converts the document to key-value pairs, filters out null values, and reconstructs the document.

## Removing Fields from Embedded Arrays

To remove a field from every element in an embedded array, use an update pipeline with `$map`:

```javascript
db.orders.updateMany(
  {},
  [
    {
      $set: {
        lineItems: {
          $map: {
            input: "$lineItems",
            as: "item",
            in: {
              $unsetField: {
                field: "internalCost",
                input: "$$item"
              }
            }
          }
        }
      }
    }
  ]
);
```

## Summary

Use `$unset` in update operations for permanent field removal. Use projection exclusion (`field: 0`) in `find` queries to omit fields from results. In aggregation, use `$project` with `0` for exclusion or `$$REMOVE` in `$addFields` for conditional removal. Use `$unsetField` combined with `$map` to remove fields from embedded array elements.
