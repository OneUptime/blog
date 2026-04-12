# How to Use $redact for Field-Level Access Control in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Security

Description: Learn how MongoDB's $redact aggregation stage filters document sub-trees based on conditions, enabling field-level security in aggregation pipelines.

---

The `$redact` stage in MongoDB's aggregation pipeline lets you control which parts of a document are returned based on a condition evaluated at each level of the document tree. It is useful for implementing field-level access control without maintaining separate collections per access tier.

## How $redact Works

`$redact` recursively traverses every level (root, sub-document, array element) and applies a conditional expression. The expression must return one of three system variables:

| Variable | Meaning |
|---|---|
| `$$KEEP` | Include this level and all its children |
| `$$PRUNE` | Exclude this level and all its children |
| `$$DESCEND` | Include this level but evaluate each child separately |

## Basic Syntax

```javascript
db.collection.aggregate([
  { $redact: { $cond: { if: condition, then: "$$KEEP", else: "$$PRUNE" } } }
])
```

## Example 1 - Filter by a Security Label Field

Each sub-document has a `clearance` field. Only include sub-documents where `clearance` is `"public"` or absent:

```javascript
db.reports.aggregate([
  {
    $redact: {
      $cond: {
        if: {
          $or: [
            { $eq: ["$clearance", "public"] },
            { $eq: [{ $type: "$clearance" }, "missing"] }
          ]
        },
        then: "$$DESCEND",
        else: "$$PRUNE"
      }
    }
  }
])
```

`$$DESCEND` continues evaluation on nested levels, pruning any child where the condition fails.

## Example 2 - Role-Based Document Redaction

Inject the user's roles as a variable and prune sections not in those roles:

```javascript
const userRoles = ["admin", "viewer"]

db.documents.aggregate([
  {
    $redact: {
      $cond: {
        if: {
          $gt: [
            { $size: { $setIntersection: ["$roles", userRoles] } },
            0
          ]
        },
        then: "$$DESCEND",
        else: "$$PRUNE"
      }
    }
  }
])
```

A section with `roles: ["admin"]` is included for an admin user. A section with `roles: ["superuser"]` is pruned.

## Example 3 - Using $$KEEP to Short-Circuit Descent

When a document or sub-document passes a top-level check, use `$$KEEP` to include everything underneath without further evaluation:

```javascript
db.configs.aggregate([
  {
    $redact: {
      $cond: {
        if: { $eq: ["$env", "production"] },
        then: "$$KEEP",
        else: "$$DESCEND"
      }
    }
  }
])
```

Production-tagged blocks are kept entirely. Other blocks are descended into and evaluated field by field.

## Combining $redact with $match

Place a `$match` stage before `$redact` to reduce the working set first:

```javascript
db.reports.aggregate([
  { $match: { year: 2026 } },
  {
    $redact: {
      $cond: {
        if: { $in: ["$$CURRENT.level", ["public", "internal"]] },
        then: "$$DESCEND",
        else: "$$PRUNE"
      }
    }
  }
])
```

## Limitations

- `$redact` evaluates the same expression at every nesting level - there is no way to apply different logic per depth level without nested `$cond`.
- Fields without the access-control field are not automatically pruned; you must handle missing fields explicitly.
- For simpler projection-based access control, `$project` is easier. `$redact` shines when the structure of sensitive data is nested and dynamic.

## Summary

`$redact` enables field-level and sub-document-level access control within an aggregation pipeline by recursively evaluating a condition and returning `$$KEEP`, `$$PRUNE`, or `$$DESCEND` at each level. It is a powerful tool for multi-tenant systems and documents with mixed-clearance content, eliminating the need for separate collections per access tier.
