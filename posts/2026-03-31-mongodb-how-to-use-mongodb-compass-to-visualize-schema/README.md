# How to Use MongoDB Compass to Visualize Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MongoDB Compass, Schema, Data Modeling, Developer Tool

Description: Learn how to use MongoDB Compass schema visualization to explore document structure, field types, data distributions, and identify schema inconsistencies.

---

## What is MongoDB Compass Schema View

MongoDB Compass provides a Schema tab for each collection that samples documents and displays:
- All fields present in the sampled documents
- Data types for each field (with mixed-type detection)
- Value distributions via histograms and bar charts
- Min/max ranges for numeric and date fields
- Sample values for string fields

This helps you understand your data without writing queries.

## Connecting to MongoDB

Launch MongoDB Compass and connect using a connection string:

```text
mongodb://localhost:27017
```

Or for Atlas:

```text
mongodb+srv://username:password@cluster0.example.mongodb.net/mydb
```

## Analyzing Schema from the Schema Tab

1. Select your database and collection in the left panel
2. Click the **Schema** tab
3. Click **Analyze Schema** (Compass samples up to 1,000 documents by default)

The analysis shows each field with:
- **Type indicator** - string, number, date, array, object, ObjectId, etc.
- **Percentage** - what percentage of documents contain the field
- **Distribution chart** - value distribution for the sampled documents

## Reading Field Type Distributions

When a field has mixed types, Compass displays a multi-colored type bar. For example, if `age` contains both numbers and strings, Compass shows the proportion of each type:

```text
Field: age
Types: Number (85%) | String (10%) | Null (5%)
```

This often indicates data quality issues from inconsistent writes.

## Filtering Schema Analysis

You can apply a query filter before analyzing the schema to see the structure of a specific subset:

```javascript
// Filter to analyze only premium users
{ "subscription": "premium", "active": true }
```

Enter this filter in the Filter bar, then click **Analyze Schema** to see the schema only for matching documents.

## Detecting Missing Fields

The field presence percentage tells you about schema completeness. Fields present in fewer than 100% of documents indicate optional or inconsistently written fields:

```text
Field: phone_number  - 42% of documents
Field: billing_address - 67% of documents
Field: email - 100% of documents
```

## Identifying Nested Document Structure

Compass recursively expands nested objects and arrays so you can see the full document tree:

```text
order
  _id: ObjectId
  customerId: ObjectId
  items: Array (100%)
    [0]: Object
      productId: ObjectId
      quantity: Number
      price: Number
  totalAmount: Number
  status: String
    "pending" (45%)
    "shipped" (30%)
    "delivered" (20%)
    "cancelled" (5%)
  createdAt: Date
```

## Using Schema Analysis for Index Planning

Compass schema analysis helps identify good index candidates:
- High-cardinality string fields used in queries (e.g., `email`, `userId`)
- Date fields used for range queries (e.g., `createdAt`)
- Fields used together in compound queries

After identifying candidates in the Schema tab, switch to the **Indexes** tab to create and manage indexes.

## Using Schema Analysis to Create Validation Rules

The insights from the Schema tab can inform validation rules for your collection. Switch to the **Validation** tab in Compass to define a `$jsonSchema` validator based on what you observed in the schema analysis:

```javascript
// Example $jsonSchema validation based on schema analysis
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email'],
      properties: {
        name: { bsonType: 'string', maxLength: 200 },
        email: { bsonType: 'string' },
        age: { bsonType: 'int', minimum: 0, maximum: 150 },
      },
    },
  },
});
```

## Summary

MongoDB Compass schema visualization samples your collection and displays field types, presence percentages, and value distributions without requiring any query knowledge. It is particularly useful for discovering mixed-type fields, identifying schema inconsistencies, understanding data completeness, and planning which fields to index for query performance.
