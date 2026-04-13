# How to Use Equality and Range Queries on Encrypted Fields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Queryable Encryption, Security, Query, Encryption

Description: Learn how to run equality and range queries on encrypted fields using MongoDB Queryable Encryption, with schema configuration and driver examples.

---

MongoDB Queryable Encryption allows you to query encrypted fields without decrypting them on the server. The two supported query types are equality and range. Each requires different field configuration and has different performance characteristics.

## Equality Queries

Equality queries allow you to find documents where an encrypted field exactly matches a given value. This is the most common use case - for example, looking up a patient by Social Security Number.

### Field Configuration

```javascript
const encryptedFieldsMap = {
  "mydb.patients": {
    fields: [
      {
        path: "ssn",
        bsonType: "string",
        queries: [{ queryType: "equality" }]
      }
    ]
  }
};
```

### Querying

```javascript
const result = await db.collection("patients").findOne({ ssn: "123-45-6789" });
```

The driver encrypts `"123-45-6789"` before sending the query. MongoDB matches encrypted tokens server-side without exposing the plaintext.

## Range Queries

Range queries support `$gt`, `$gte`, `$lt`, and `$lte` on encrypted numeric or date fields. Configuration requires specifying the data type bounds.

### Field Configuration for Range

```javascript
const encryptedFieldsMap = {
  "mydb.employees": {
    fields: [
      {
        path: "salary",
        bsonType: "int",
        queries: [
          {
            queryType: "range",
            sparsity: 1,
            min: 30000,
            max: 500000,
            trimFactor: 6
          }
        ]
      }
    ]
  }
};
```

`min` and `max` define the valid range. `sparsity` and `trimFactor` control the balance between security and query performance.

### Querying with Range

```javascript
// Find employees with salary between 60000 and 100000
const cursor = await db.collection("employees").find({
  salary: { $gte: 60000, $lte: 100000 }
});
```

## Supported BSON Types for Range

| BSON Type | Supported for Range |
|-----------|---------------------|
| int       | Yes                 |
| long      | Yes                 |
| double    | Yes                 |
| decimal   | Yes                 |
| date      | Yes                 |
| string    | No                  |
| bool      | No                  |

## Combining Equality and Range on the Same Field

A field cannot have both equality and range query types simultaneously. Choose the query type based on how you need to search:

```javascript
// This is INVALID - cannot combine queryType on same field
{
  path: "age",
  bsonType: "int",
  queries: [
    { queryType: "equality" },
    { queryType: "range", min: 0, max: 120 }
  ]
}
```

If you need both, consider storing two fields or restructuring your access patterns.

## Index Requirements

Create the encrypted collection through the driver - it will automatically create the required metadata collections:

```javascript
await db.createCollection("patients", {
  encryptedFields: encryptedFieldsMap["mydb.patients"]
});
```

This creates `enxcol_.patients.esc`, `enxcol_.patients.ecoc`, and supporting indexes automatically.

## Summary

MongoDB Queryable Encryption supports equality queries for exact-match lookups on encrypted fields like SSNs or email addresses, and range queries for ordered numeric or date comparisons like salary bands or birth dates. Configure the `queryType` in the `encryptedFieldsMap` to enable the right query capability. Range queries require explicit `min` and `max` bounds and only work on numeric and date BSON types.
