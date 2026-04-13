# How to Format Dates as Strings in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Date, String, Formatting

Description: Learn how to format BSON Date values as strings in MongoDB aggregation using $dateToString with custom format specifiers and timezone support.

---

## Overview

When building reports or exporting data from MongoDB, you often need to convert BSON Date values into human-readable strings. The `$dateToString` aggregation operator handles this with flexible format specifiers and timezone awareness.

## Basic $dateToString Usage

```javascript
db.orders.aggregate([
  {
    $project: {
      formattedDate: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt"
        }
      }
    }
  }
]);
```

This produces output like `"2026-01-15"`.

## Common Format Specifiers

| Specifier | Meaning | Example |
|-----------|---------|---------|
| `%Y` | 4-digit year | 2026 |
| `%m` | Month (01-12) | 01 |
| `%d` | Day (01-31) | 15 |
| `%H` | Hour (00-23) | 10 |
| `%M` | Minute (00-59) | 30 |
| `%S` | Second (00-59) | 00 |
| `%L` | Millisecond (000-999) | 000 |

## Formatting with Timezone

By default, dates are formatted in UTC. Pass a `timezone` argument to convert first.

```javascript
db.orders.aggregate([
  {
    $project: {
      localDate: {
        $dateToString: {
          format: "%Y-%m-%d %H:%M:%S",
          date: "$createdAt",
          timezone: "America/New_York"
        }
      }
    }
  }
]);
```

## Handling Null Dates

Use `onNull` to provide a fallback string when the date field is missing or null.

```javascript
db.orders.aggregate([
  {
    $project: {
      formattedDate: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$updatedAt",
          onNull: "N/A"
        }
      }
    }
  }
]);
```

## Grouping by Formatted Date

A common use case is grouping documents by day or month for reporting.

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      },
      monthlyRevenue: { $sum: "$amount" }
    }
  },
  { $sort: { "_id": 1 } }
]);
```

## Formatting for CSV Export

When exporting to CSV, format all date fields consistently.

```javascript
db.events.aggregate([
  {
    $project: {
      eventDate: {
        $dateToString: { format: "%Y-%m-%dT%H:%M:%SZ", date: "$occurredAt" }
      },
      name: 1,
      type: 1
    }
  }
]);
```

## Summary

MongoDB's `$dateToString` operator provides flexible date-to-string conversion within aggregation pipelines. Use format specifiers to control output layout, the `timezone` argument for local time conversion, and `onNull` to handle missing date fields gracefully.
