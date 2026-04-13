# How to Use $min to Update a Field Only If the New Value Is Lower

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update Operator, $min, Conditional Updates, NoSQL

Description: Learn how to use MongoDB's $min operator to update a field only when the new value is lower than the current value, ideal for tracking minimums and low-water marks.

---

## What Is the $min Operator?

The `$min` operator updates the value of a field only if the specified value is less than the current value of the field. If the field does not exist, `$min` sets it to the specified value. It compares values using MongoDB's BSON comparison order.

```javascript
db.collection.updateOne(
  { filter },
  { $min: { fieldName: value } }
)
```

## Basic Example

Track the lowest recorded temperature for a weather station:

```javascript
// Current document: { stationId: "s1", minTemp: 15 }

db.weather.updateOne(
  { stationId: "s1" },
  { $min: { minTemp: 10 } }
)
// minTemp becomes 10 (10 < 15)

db.weather.updateOne(
  { stationId: "s1" },
  { $min: { minTemp: 20 } }
)
// minTemp stays 10 (20 is NOT < 10)
```

## Tracking Minimum Scores

Record the personal best (lowest time) for race participants:

```javascript
db.racers.updateOne(
  { racerId: "r42" },
  {
    $min: { bestTime: 245.3 },
    $set: { lastRaceAt: new Date() }
  }
)
```

## Field Does Not Exist

When the field does not exist, `$min` acts like `$set`:

```javascript
// Before: { _id: 1, name: "Server-A" }
db.servers.updateOne({ _id: 1 }, { $min: { minResponseMs: 120 } })
// After:  { _id: 1, name: "Server-A", minResponseMs: 120 }
```

## Using $min with Dates

`$min` works with dates using BSON date comparison:

```javascript
// Track the earliest order date per customer
db.customers.updateOne(
  { customerId: "c100" },
  { $min: { firstOrderDate: new Date("2024-06-15") } }
)
```

Only updates if the new date is earlier than the stored one.

## Practical Use Case - SLA Tracking

Track minimum uptime percentage across monitoring windows:

```javascript
function recordUptimeSnapshot(serviceId, uptimePercent) {
  return db.services.updateOne(
    { serviceId: serviceId },
    {
      $min: { minUptime: uptimePercent },
      $set: { lastCheckedAt: new Date() }
    },
    { upsert: true }
  );
}
```

## Practical Use Case - Price History

Keep a running record of the lowest observed price for a product:

```javascript
db.products.updateOne(
  { sku: "LAPTOP-X1" },
  {
    $min: { allTimeLowestPrice: currentPrice },
    $set: { currentPrice: currentPrice, priceUpdatedAt: new Date() }
  }
)
```

## Using $min with updateMany

Apply to multiple documents at once - for example, cap all scores at a maximum by setting a floor using `$min` in reverse logic or use `$max` for caps. To set a minimum floor value:

```javascript
// Ensure no product has a price lower than cost (maintain margin floor)
db.products.updateMany(
  {},
  [{ $set: { price: { $max: ["$price", "$cost"] } } }]  // aggregation pipeline update
)
```

For `$min` specifically - set an upper cap:

```javascript
// Cap all credit limits to 10000
db.accounts.updateMany(
  {},
  { $min: { creditLimit: 10000 } }
)
```

## Comparing $min vs $set

```javascript
// $set always overwrites regardless of comparison
db.items.updateOne({ _id: 1 }, { $set: { price: 50 } })  // always sets to 50

// $min only updates if 50 is lower than current value
db.items.updateOne({ _id: 1 }, { $min: { price: 50 } })  // sets to 50 only if current > 50
```

## Summary

The `$min` operator provides conditional updates that only take effect when the new value is smaller than the current value. It's ideal for tracking lowest scores, earliest dates, minimum response times, and maintaining low-water marks in time-series or monitoring data. Combined with `$max`, it enables efficient boundary tracking without application-level read-modify-write cycles.
