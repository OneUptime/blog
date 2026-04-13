# How to Use MongoDB Compass to Build Aggregation Pipelines Visually

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compass, Aggregation, Query Building

Description: Learn how to use MongoDB Compass's Aggregation Pipeline Builder to construct, test, and export aggregation pipelines visually without writing raw MongoDB syntax.

---

## Overview

MongoDB Compass includes a visual Aggregation Pipeline Builder that lets you construct complex pipelines stage by stage. Each stage is shown in its own panel with input/output preview, making it easy to understand data transformation at each step. This is particularly helpful for learning aggregation syntax or debugging complex pipelines.

## Accessing the Aggregation Builder

1. Open MongoDB Compass and connect to your server
2. Navigate to a collection (e.g., `mydb.orders`)
3. Click the **Aggregations** tab at the top of the collection view

## Adding Your First Stage

Click "Add Stage" and select a stage operator from the dropdown:

```text
$match
$group
$project
$sort
$limit
$lookup
$unwind
$addFields
$count
$out
$merge
```

Compass shows the stage's documentation and a template to fill in.

## Building a Pipeline - Step by Step Example

### Goal: Find top 5 customers by total spend

**Stage 1 - $match** - filter to completed orders only

```javascript
{
  "status": "completed"
}
```

Compass shows the filtered documents on the right side of the stage, so you can verify the filter works before proceeding.

**Stage 2 - $group** - group by customer and sum totals

```javascript
{
  "_id": "$customerId",
  "totalSpend": { "$sum": "$total" },
  "orderCount": { "$sum": 1 },
  "avgOrderValue": { "$avg": "$total" }
}
```

Compass shows sample group output immediately.

**Stage 3 - $sort** - sort by totalSpend descending

```javascript
{
  "totalSpend": -1
}
```

**Stage 4 - $limit** - take top 5

```javascript
5
```

**Stage 5 - $project** - reshape output

```javascript
{
  "_id": 0,
  "customerId": "$_id",
  "totalSpend": 1,
  "orderCount": 1,
  "avgOrderValue": { "$round": ["$avgOrderValue", 2] }
}
```

## Live Preview

Each stage in Compass shows:
- **Input documents** - data entering this stage (sample from previous stage)
- **Stage editor** - where you write the stage expression
- **Output preview** - the first few documents after this stage is applied

This real-time feedback loop makes debugging much faster than running the full pipeline each time.

## Toggling Stages On/Off

Click the eye icon on any stage to temporarily disable it. This lets you:
- Test pipeline behavior without a specific stage
- Isolate whether a particular stage is causing problems
- Compare output with and without a transformation

## Saving Pipelines

Save pipelines to reuse them later:

1. Click the "Save Pipeline" button
2. Give it a name
3. Click "Save"

Saved pipelines appear in a list and can be opened later. To create a view from a pipeline, see the "Creating a View from a Pipeline" section below.

## Exporting Pipeline Code

Once your pipeline is working, export it to use in your application:

1. Click the "Export to Language" button
2. Choose your language: JavaScript, Python, Java, C#, PHP, Ruby, Rust, Go
3. Copy the generated code

Example generated Node.js code:

```javascript
const agg = [
  {
    '$match': {
      status: 'completed'
    }
  },
  {
    '$group': {
      _id: '$customerId',
      totalSpend: { '$sum': '$total' },
      orderCount: { '$sum': 1 },
      avgOrderValue: { '$avg': '$total' }
    }
  },
  {
    '$sort': {
      totalSpend: -1
    }
  },
  {
    '$limit': 5
  },
  {
    '$project': {
      _id: 0,
      customerId: '$_id',
      totalSpend: 1,
      orderCount: 1,
      avgOrderValue: { '$round': ['$avgOrderValue', 2] }
    }
  }
];

const cursor = db.collection('orders').aggregate(agg);
const results = await cursor.toArray();
```

## Common Pipeline Patterns in Compass

### $lookup (Join)

```javascript
// Stage: $lookup - join orders with customers
{
  "from": "customers",
  "localField": "customerId",
  "foreignField": "_id",
  "as": "customerInfo"
}
```

### $unwind (Flatten Arrays)

```javascript
// Stage: $unwind - expand lineItems array
{
  "path": "$lineItems",
  "includeArrayIndex": "itemIndex",
  "preserveNullAndEmptyArrays": true
}
```

### $bucket (Range Grouping)

```javascript
// Stage: $bucket - group orders into price ranges
{
  "groupBy": "$total",
  "boundaries": [0, 50, 100, 250, 500, 1000],
  "default": "1000+",
  "output": {
    "count": { "$sum": 1 },
    "avgTotal": { "$avg": "$total" }
  }
}
```

## Creating a View from a Pipeline

A MongoDB view is a read-only virtual collection backed by an aggregation pipeline:

1. Build your pipeline in the Aggregation Builder
2. Click "Create View"
3. Give the view a name (e.g., `completed_order_summaries`)
4. Click "Create View"

The view appears as a collection in the left panel and can be queried like any other collection:

```javascript
// Query the view like a regular collection
db.completed_order_summaries.find({ totalSpend: { $gte: 500 } })
```

## Summary

MongoDB Compass's Aggregation Pipeline Builder provides a visual, stage-by-stage interface for constructing complex aggregation pipelines. Each stage shows input and output previews, making it easy to verify each transformation. Stages can be toggled on/off to test pipeline behavior and the built-in export generates application-ready code in multiple languages. The pipeline builder is the fastest way to learn aggregation syntax and prototype pipelines before integrating them into production code.
