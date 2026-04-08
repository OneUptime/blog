# How to Create Pivot Tables in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Pivot, Analytics, Pipeline

Description: Learn how to create pivot tables in MongoDB aggregation pipelines using $group, $cond, and dynamic key techniques to reshape data for reporting.

---

Pivot tables transform rows into columns, letting you compare values across categories side by side. MongoDB does not have a built-in PIVOT keyword, but you can replicate pivot behavior using `$group` with conditional accumulation.

## Static Pivot with $group and $cond

Consider a `sales` collection with documents like:

```javascript
{ region: "East", product: "Widget", revenue: 500 }
{ region: "West", product: "Gadget", revenue: 300 }
{ region: "East", product: "Gadget", revenue: 200 }
```

To pivot so each row is a region and each column is a product:

```javascript
db.sales.aggregate([
  {
    $group: {
      _id: "$region",
      widgetRevenue: {
        $sum: { $cond: [{ $eq: ["$product", "Widget"] }, "$revenue", 0] }
      },
      gadgetRevenue: {
        $sum: { $cond: [{ $eq: ["$product", "Gadget"] }, "$revenue", 0] }
      }
    }
  },
  {
    $project: {
      _id: 0,
      region: "$_id",
      widgetRevenue: 1,
      gadgetRevenue: 1
    }
  },
  { $sort: { region: 1 } }
])
```

Each `$cond` checks the product name and contributes revenue only when it matches.

## Dynamic Pivot Using $group + $push then $arrayToObject

When product names are not known in advance, build a dynamic pivot:

```javascript
db.sales.aggregate([
  // Step 1: group by region+product to get subtotals
  {
    $group: {
      _id: { region: "$region", product: "$product" },
      totalRevenue: { $sum: "$revenue" }
    }
  },
  // Step 2: group by region, collecting k-v pairs
  {
    $group: {
      _id: "$_id.region",
      products: {
        $push: { k: "$_id.product", v: "$totalRevenue" }
      }
    }
  },
  // Step 3: convert array of k-v pairs to object
  {
    $project: {
      region: "$_id",
      revenueByProduct: { $arrayToObject: "$products" }
    }
  },
  { $sort: { region: 1 } }
])
```

`$arrayToObject` converts `[{k: "Widget", v: 700}]` into `{ Widget: 700 }`.

## Pivot with Row and Column Totals

Add totals by incorporating a separate `$group` and `$project`:

```javascript
db.sales.aggregate([
  {
    $group: {
      _id: { region: "$region", product: "$product" },
      revenue: { $sum: "$revenue" }
    }
  },
  {
    $group: {
      _id: "$_id.region",
      products: { $push: { k: "$_id.product", v: "$revenue" } },
      totalRevenue: { $sum: "$revenue" }
    }
  },
  {
    $project: {
      _id: 0,
      region: "$_id",
      breakdown: { $arrayToObject: "$products" },
      totalRevenue: 1
    }
  }
])
```

## Pivot with $facet for Multiple Dimensions

Use `$facet` to compute multiple pivot views in a single query pass:

```javascript
db.sales.aggregate([
  {
    $facet: {
      byRegion: [
        { $group: { _id: "$region", total: { $sum: "$revenue" } } }
      ],
      byProduct: [
        { $group: { _id: "$product", total: { $sum: "$revenue" } } }
      ]
    }
  }
])
```

## Performance Considerations

- Index fields used in `$group` `_id` expressions (e.g., `region`, `product`) to allow early filtering with `$match`.
- Static pivots with `$cond` are faster than dynamic pivots because they avoid the `$arrayToObject` conversion step.
- Large dynamic pivots with many unique column values can produce wide documents - monitor document size relative to the 16 MB limit.
- Always place a `$match` stage before `$group` to reduce the input dataset.

## Summary

MongoDB pivot tables use `$group` with `$cond` for static column definitions, or `$push` + `$arrayToObject` for dynamic column generation. Both approaches let you reshape row-oriented data into columnar reporting formats entirely within the aggregation pipeline.
