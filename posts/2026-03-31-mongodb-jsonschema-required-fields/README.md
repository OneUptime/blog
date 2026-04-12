# How to Use $jsonSchema with Required Fields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Data Quality, Database

Description: Learn how to use the $jsonSchema required keyword in MongoDB collection validation to enforce that documents always contain specific fields before insertion or update.

---

MongoDB's `$jsonSchema` validator lets you define rules that every document in a collection must satisfy. The `required` keyword is one of the most important - it ensures that specific fields must be present in every document. Documents that violate validation rules are rejected with an error at write time.

## Adding Required Field Validation

Use `db.createCollection()` with a validator, or `db.runCommand({ collMod })` for an existing collection.

**Creating a new collection with required fields:**

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        username: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        createdAt: {
          bsonType: "date",
          description: "must be a date and is required"
        }
      }
    }
  }
});
```

## Testing Required Field Validation

**Valid insert (all required fields present):**

```javascript
db.users.insertOne({
  email: "alice@example.com",
  username: "alice",
  createdAt: new Date()
});
// Succeeds
```

**Invalid insert (missing required field):**

```javascript
db.users.insertOne({
  email: "bob@example.com",
  createdAt: new Date()
  // username is missing
});
```

Error:

```text
MongoServerError: Document failed validation
```

## Requiring Nested Fields

Define nested `required` arrays inside subdocument schemas to require fields in subdocuments:

```javascript
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customerId", "items", "shipping"],
      properties: {
        shipping: {
          bsonType: "object",
          required: ["address", "city", "country"],
          properties: {
            address: { bsonType: "string" },
            city: { bsonType: "string" },
            country: { bsonType: "string" }
          }
        }
      }
    }
  }
});
```

**Valid insert:**

```javascript
db.orders.insertOne({
  customerId: "cust_01",
  items: [{ sku: "ABC", qty: 2 }],
  shipping: {
    address: "123 Main St",
    city: "New York",
    country: "US"
  }
});
```

## Applying Validation to an Existing Collection

```javascript
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username", "createdAt"],
      properties: {
        email: { bsonType: "string" },
        username: { bsonType: "string" },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

## Viewing the Current Validation Rules

```javascript
db.getCollectionInfos({ name: "users" })[0].options.validator;
```

Or use the `listCollections` command:

```javascript
db.runCommand({ listCollections: 1, filter: { name: "users" } });
```

## Required Fields vs. Field Existence Check

Note: `required` only checks that the field key exists in the document. It does not validate the field value unless you also define a `properties` schema with type or constraint rules. A field value of `null` satisfies the `required` check on its own.

However, with the `users` schema defined above, the following insert would fail because `bsonType: "string"` rejects `null`:

```javascript
db.users.insertOne({
  email: null,
  username: "test",
  createdAt: new Date()
});
// Fails: bsonType "string" does not allow null
```

If the schema used only `required` without `bsonType` constraints on `email`, the null value would be accepted. To explicitly prevent null values, always pair `required` with a `bsonType` that excludes null.

## Summary

The `required` array in `$jsonSchema` validators ensures that listed fields must be present in every document written to the collection. Apply it via `createCollection` for new collections or `collMod` for existing ones. Use nested `required` arrays inside `properties` to enforce required fields in subdocuments. Always pair `required` with `bsonType` rules to also validate the field values.
