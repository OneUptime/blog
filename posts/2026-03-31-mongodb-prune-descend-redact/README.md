# How to Use $$PRUNE and $$DESCEND with $redact in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Security

Description: Learn how to use MongoDB $redact stage with $$PRUNE, $$DESCEND, and $$KEEP to recursively filter document fields based on access control conditions.

---

`$redact` is a MongoDB aggregation stage that recursively processes a document tree, visiting each node (document and subdocument) and deciding - based on your expression - whether to keep it, remove it, or recurse deeper into it. It is the primary tool for document-level field access control in aggregation.

## The Three Return Values

When the expression in `$redact` evaluates for a given sub-document node:

- `$$KEEP` - include this node and all its children without further inspection
- `$$PRUNE` - exclude this node and all its children entirely
- `$$DESCEND` - do not make a keep/prune decision yet; recurse into this node's child fields

At leaf nodes (scalar values), `$$DESCEND` is not meaningful - MongoDB treats it as `$$KEEP`.

## Basic Redaction: Access Level Field

Documents have an `accessLevel` field. Only return sub-documents where `accessLevel` is at most the user's clearance:

```javascript
const userClearance = 2;

db.reports.aggregate([
  {
    $redact: {
      $cond: {
        if: {
          $or: [
            { $not: ["$accessLevel"] },     // no accessLevel field - allow
            { $lte: ["$accessLevel", userClearance] }
          ]
        },
        then: "$$DESCEND",
        else: "$$PRUNE"
      }
    }
  }
]);
```

At each node: if `accessLevel` is absent or within clearance, descend into children. Otherwise, prune the entire sub-document.

## $$KEEP for Early Exit

Use `$$KEEP` when a node passing a condition should not be inspected further:

```javascript
db.catalog.aggregate([
  {
    $redact: {
      $cond: {
        if: { $eq: ["$visibility", "public"] },
        then: "$$KEEP",       // keep entire node, no need to inspect children
        else: {
          $cond: {
            if: { $eq: ["$visibility", "internal"] },
            then: "$$DESCEND", // inspect children for finer access control
            else: "$$PRUNE"
          }
        }
      }
    }
  }
]);
```

`$$KEEP` is an optimization: once a node is approved, children are not checked, saving recursion cost.

## Redacting Based on Array Membership

Check if a required label is in the current node's `labels` array:

```javascript
const userGroups = ["engineering", "management"];

db.documents.aggregate([
  {
    $redact: {
      $cond: {
        if: {
          $or: [
            { $not: [{ $isArray: "$requiredGroups" }] },
            {
              $gt: [
                {
                  $size: {
                    $setIntersection: ["$requiredGroups", userGroups]
                  }
                },
                0
              ]
            }
          ]
        },
        then: "$$DESCEND",
        else: "$$PRUNE"
      }
    }
  }
]);
```

Nodes with no `requiredGroups` are accessible to all. Nodes whose `requiredGroups` overlaps the user's groups are descended into.

## How $redact Traverses the Document

`$redact` starts at the root document and applies the expression. If the result is `$$DESCEND`, it returns the fields at the current document level and applies the same expression to embedded documents. For array fields, `$redact` applies the expression to each document element in the array individually, pruning or keeping each element based on the result.

## $redact vs. $project for Field Filtering

`$project` excludes known fields by name. `$redact` excludes fields based on the content of those fields - it is data-driven and recursive. Use `$project` for static schema shaping; use `$redact` for dynamic, content-based access control.

## Combining $match and $redact

Place `$match` before `$redact` to use indexes for pre-filtering, then `$redact` for field-level access control:

```javascript
db.reports.aggregate([
  { $match: { year: 2026 } },   // index-backed filter
  { $redact: { /* access control */ } }
]);
```

## Summary

`$redact` with `$$DESCEND`, `$$PRUNE`, and `$$KEEP` implements recursive field-level access control in MongoDB aggregation. Use `$$DESCEND` to continue inspection, `$$PRUNE` to remove the current node entirely, and `$$KEEP` to include the current node without further checks. Always place indexed `$match` stages before `$redact` to reduce the document set before recursion.
