# How to Use Studio 3T for Advanced MongoDB Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Studio 3T, Developer Tool, Aggregation, Migration

Description: Learn how to use Studio 3T's advanced features for MongoDB including the Aggregation Editor, SQL to MongoDB query translation, data import/export, and task scheduling.

---

## Studio 3T vs. Studio 3T Free

Studio 3T (the paid version) extends Studio 3T Free (the successor to the discontinued Robo 3T) with a visual Aggregation Editor, SQL query translation, MongoImport/Export wizards, data comparison tools, and scheduled task automation. It is designed for teams doing regular MongoDB operations and migrations.

## Visual Aggregation Editor

The Aggregation Editor lets you build pipelines stage-by-stage with a visual UI:

1. Open a collection > Click "Aggregation" tab
2. Add stages with the + button
3. Each stage shows input documents on the left and output documents on the right

Equivalent pipeline in shell syntax:

```javascript
db.orders.aggregate([
  { $match: { status: "paid", createdAt: { $gte: ISODate("2026-01-01") } } },
  { $group: {
    _id: "$customerId",
    totalSpend: { $sum: "$total" },
    orderCount: { $sum: 1 }
  }},
  { $lookup: {
    from: "customers",
    localField: "_id",
    foreignField: "_id",
    as: "customer"
  }},
  { $unwind: "$customer" },
  { $sort: { totalSpend: -1 } },
  { $limit: 20 }
]);
```

The editor validates each stage and previews intermediate results, making it easy to debug complex pipelines.

## SQL to MongoDB Query Translation

Studio 3T's SQL translation layer accepts standard SQL and converts it to MongoDB shell syntax:

```sql
SELECT customerId, SUM(total) as totalSpend, COUNT(*) as orderCount
FROM orders
WHERE status = 'paid'
  AND createdAt >= '2026-01-01'
GROUP BY customerId
ORDER BY totalSpend DESC
LIMIT 20;
```

Generated MongoDB query:

```javascript
db.orders.aggregate([
  { $match: { status: "paid", createdAt: { $gte: ISODate("2026-01-01T00:00:00.000Z") } } },
  { $group: { _id: "$customerId", totalSpend: { $sum: "$total" }, orderCount: { $sum: 1 } } },
  { $sort: { totalSpend: -1 } },
  { $limit: 20 }
]);
```

This is valuable for developers more comfortable with SQL who are transitioning to MongoDB.

## Import Wizard

Import from CSV, JSON, BSON, or SQL Server:

1. Right-click a collection > Import
2. Choose source format
3. Map source columns to MongoDB fields
4. Configure type mapping (string to ObjectId, string to Date, etc.)

Example mapping configuration:

```text
CSV Column     MongoDB Field    Type
-----------    -----------      ------
order_id       _id              ObjectId
customer_id    customerId       ObjectId
order_total    total            Double
created_date   createdAt        Date (format: yyyy-MM-dd)
```

## Export Wizard

Export to JSON, CSV, BSON, SQL, or directly to another MongoDB connection:

```bash
# Equivalent mongoexport command
mongoexport \
  --uri mongodb://localhost:27017/shop \
  --collection orders \
  --query '{"status":"paid"}' \
  --type csv \
  --fields customerId,total,createdAt \
  --out orders-paid.csv
```

## Data Comparison Tool

Compare two collections (source vs. target) after a migration:

1. Tools > Compare Collections
2. Select source and target connections and collections
3. Choose comparison key (usually `_id`)
4. Run comparison - shows documents only in source, only in target, and documents that differ

## Task Automation

Studio 3T's Task Runner lets you schedule imports, exports, and aggregation runs:

```text
Task: Daily Revenue Export
Schedule: Every day at 02:00 UTC
Action: Export aggregation result to /reports/daily-revenue.csv
```

## Summary

Studio 3T's advanced features - the visual Aggregation Editor with per-stage preview, SQL-to-MongoDB query translation, type-aware import/export wizards, cross-collection data comparison, and scheduled task automation - make it valuable for production MongoDB operations and migrations. The Aggregation Editor alone saves significant debugging time by showing intermediate pipeline stage results visually.
