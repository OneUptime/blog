# How to Use $dateToString and $dateFromString in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Date Formatting, Database

Description: Learn how to use $dateToString and $dateFromString in MongoDB aggregation to convert dates to formatted strings and parse string values back into BSON dates.

---

## Overview

MongoDB's `$dateToString` and `$dateFromString` operators bridge the gap between BSON date objects and human-readable string representations. These operators are invaluable when ingesting date strings from external systems, formatting dates for output, or grouping data by formatted date periods.

## Using $dateToString to Format Dates

The `$dateToString` operator converts a BSON date to a formatted string using a format specifier string similar to C's `strftime`.

```javascript
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      formattedDate: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt"
        }
      }
    }
  }
])
```

Common format specifiers:

```text
%Y - 4-digit year (e.g., 2025)
%m - 2-digit month (01-12)
%d - 2-digit day of month (01-31)
%H - 2-digit hour (00-23)
%M - 2-digit minute (00-59)
%S - 2-digit second (00-59)
%L - 3-digit millisecond (000-999)
%j - 3-digit day of year (001-366)
%w - 1-digit day of week (1=Sunday)
%U - 2-digit week of year (00-53)
```

A full datetime format example:

```javascript
db.events.aggregate([
  {
    $project: {
      label: {
        $dateToString: {
          format: "%Y-%m-%dT%H:%M:%S",
          date: "$startTime",
          timezone: "UTC"
        }
      }
    }
  }
])
```

## Timezone-Aware Formatting

Specify a timezone to output local time:

```javascript
db.logs.aggregate([
  {
    $project: {
      localTimestamp: {
        $dateToString: {
          format: "%Y-%m-%d %H:%M:%S",
          date: "$timestamp",
          timezone: "America/Chicago"
        }
      }
    }
  }
])
```

## Using $dateToString for Date-Based Grouping

Format dates to group by period without extracting individual components:

```javascript
db.pageviews.aggregate([
  {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$visitedAt"
        }
      },
      views: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

## Using $dateFromString to Parse Date Strings

The `$dateFromString` operator converts a date string into a BSON date object. It is the inverse of `$dateToString`.

```javascript
db.imports.aggregate([
  {
    $project: {
      parsedDate: {
        $dateFromString: {
          dateString: "$dateField",
          format: "%Y-%m-%d"
        }
      }
    }
  }
])
```

If the format matches ISO 8601, you can omit the `format` parameter:

```javascript
db.feed.aggregate([
  {
    $addFields: {
      parsedCreatedAt: {
        $dateFromString: {
          dateString: "$createdAt"
        }
      }
    }
  }
])
```

## Handling Invalid Date Strings

Use the `onError` and `onNull` options to handle bad input gracefully:

```javascript
db.rawData.aggregate([
  {
    $project: {
      safeDate: {
        $dateFromString: {
          dateString: "$dateStr",
          format: "%m/%d/%Y",
          onError: null,
          onNull: null
        }
      }
    }
  },
  {
    $match: { safeDate: { $ne: null } }
  }
])
```

## Converting Dates Across Formats in a Pipeline

Combine both operators to reformat date strings from one format to another:

```javascript
db.legacyData.aggregate([
  {
    $project: {
      reformatted: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: {
            $dateFromString: {
              dateString: "$legacyDate",
              format: "%d/%m/%Y"
            }
          }
        }
      }
    }
  }
])
```

## Summary

`$dateToString` and `$dateFromString` are essential MongoDB aggregation operators for converting between BSON dates and string representations. Use `$dateToString` for display formatting and date-based grouping, and `$dateFromString` when ingesting data from external systems that provide dates as strings. The `onNull` parameter on `$dateToString` and the `onError` and `onNull` parameters on `$dateFromString` make these operators robust against missing or malformed input.
