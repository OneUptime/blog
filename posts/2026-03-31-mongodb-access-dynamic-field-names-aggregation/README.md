# How to Access Dynamic Field Names in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Document

Description: Learn how to access fields with dynamic or variable names in MongoDB aggregation using $getField, $objectToArray, and $let.

---

Sometimes the field name you want to access is stored in another field or computed at runtime. MongoDB's standard `$fieldName` projection syntax requires literal field names. For dynamic access, MongoDB provides `$getField`. Note that `$getField` was introduced in MongoDB 5.0 but only accepted string constants for the `field` parameter. Support for dynamic expressions (such as field path references and `$concat` with field paths) was added in MongoDB 7.2.

## The Problem with Dynamic Field Names

In a regular aggregation, you cannot use a variable as a field name:

```javascript
// This does NOT work - field name must be a literal string
db.data.aggregate([
  {
    $project: {
      value: "$dynamicFieldName"   // wrong: this reads a field called "dynamicFieldName"
    }
  }
]);
```

## $getField (MongoDB 5.0+, Dynamic Expressions in 7.2+)

`$getField` retrieves a field value by name. In MongoDB 5.0–7.1, the `field` parameter must be a string constant (useful for accessing fields with dots or dollar signs in their names). Starting in MongoDB 7.2, `field` accepts any expression that resolves to a string, enabling truly dynamic field access:

```javascript
// Get the value of the field whose name is stored in "targetField"
db.data.aggregate([
  {
    $project: {
      dynamicValue: {
        $getField: {
          field: "$targetField",   // field name comes from the document
          input: "$$ROOT"
        }
      }
    }
  }
]);
```

If a document has `{ targetField: "score", score: 95 }`, this returns `{ dynamicValue: 95 }`.

## Accessing a Field with a Known Dynamic Suffix

Compute the field name from an expression:

```javascript
db.localized.aggregate([
  {
    $project: {
      localValue: {
        $getField: {
          field: {
            $concat: ["title_", "$userLanguage"]
          },
          input: "$$ROOT"
        }
      }
    }
  }
]);
```

For a document with `{ userLanguage: "fr", title_fr: "Bonjour" }`, this reads the `title_fr` field.

## Accessing Nested Dynamic Fields

To access a dynamic field within a nested subdocument, pass the subdocument as `input`:

```javascript
db.configs.aggregate([
  {
    $project: {
      settingValue: {
        $getField: {
          field: "$settingName",
          input: "$settings"    // look within the "settings" subdocument
        }
      }
    }
  }
]);
```

## $objectToArray as an Alternative

Before MongoDB 7.2 (when `$getField` gained dynamic expression support), convert the document to a key-value array and filter by key name. This approach works in MongoDB 3.4.4+:

```javascript
db.data.aggregate([
  {
    $project: {
      dynamicValue: {
        $arrayElemAt: [
          {
            $filter: {
              input: { $objectToArray: "$$ROOT" },
              as: "field",
              cond: { $eq: ["$$field.k", "$targetField"] }
            }
          },
          0
        ]
      }
    }
  },
  {
    $project: {
      dynamicValue: "$dynamicValue.v"
    }
  }
]);
```

This converts the document to `{ k, v }` pairs, filters for the one with a matching key, and extracts the value.

## Using $let for Clarity

`$let` assigns a computed field name to a variable to keep the expression readable:

```javascript
db.products.aggregate([
  {
    $project: {
      localizedName: {
        $let: {
          vars: {
            fieldName: { $concat: ["name_", "$locale"] }
          },
          in: {
            $getField: {
              field: "$$fieldName",
              input: "$$ROOT"
            }
          }
        }
      }
    }
  }
]);
```

## Summary

Use `$getField` to access fields by name in aggregation pipelines. In MongoDB 5.0–7.1, `$getField` only accepts string constants for the `field` parameter, making it useful for fields with special characters in their names. Starting in MongoDB 7.2, `field` accepts any expression that resolves to a string, enabling computed field names based on document data. For versions before 7.2, use `$objectToArray` to convert to key-value pairs and filter by key for truly dynamic field access. Combine `$getField` with `$let` when the computed field name is used more than once.
