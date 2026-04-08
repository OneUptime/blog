# How to Use $dateToString and $dateToParts in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $dateToString, $dateToParts, Pipeline, Date

Description: Learn how to use $dateToString and $dateToParts in MongoDB aggregation to format dates as strings and extract date components for analysis.

---

## $dateToString

`$dateToString` converts a date value to a formatted string. It accepts format specifiers similar to `strftime` and optionally a timezone.

### Syntax

```javascript
{
  $dateToString: {
    date: <date expression>,
    format: <format string>,    // optional (ISO-8601 default)
    timezone: <timezone>,       // optional
    onNull: <expression>        // optional: returned when date is null/missing
  }
}
```

### Format Specifiers

| Specifier | Description | Example |
|---|---|---|
| `%Y` | 4-digit year | `2026` |
| `%m` | 2-digit month | `03` |
| `%d` | 2-digit day | `31` |
| `%H` | 2-digit hour (24h) | `14` |
| `%M` | 2-digit minute | `05` |
| `%S` | 2-digit second | `09` |
| `%L` | 3-digit millisecond | `042` |
| `%Z` | UTC offset in minutes | `+0` |
| `%z` | UTC offset | `+0000` |

## $dateToParts

`$dateToParts` returns a document with each component of a date as a separate numeric field.

### Syntax

```javascript
{
  $dateToParts: {
    date: <date expression>,
    timezone: <timezone>,   // optional
    iso8601: <boolean>      // optional: use ISO-8601 week year
  }
}
```

## Examples

### Input Documents

```javascript
[
  { _id: 1, event: "Launch",  timestamp: ISODate("2026-03-31T14:05:09.042Z") },
  { _id: 2, event: "Update",  timestamp: ISODate("2026-01-15T08:30:00.000Z") },
  { _id: 3, event: "Archive", timestamp: null }
]
```

### Example 1 - $dateToString: Format as YYYY-MM-DD

```javascript
db.events.aggregate([
  {
    $project: {
      event: 1,
      date: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$timestamp"
        }
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, event: "Launch",  date: "2026-03-31" },
  { _id: 2, event: "Update",  date: "2026-01-15" },
  { _id: 3, event: "Archive", date: null }
]
```

### Example 2 - $dateToString: Custom Format

Format with time and milliseconds:

```javascript
db.events.aggregate([
  {
    $project: {
      formatted: {
        $dateToString: {
          format: "%Y/%m/%d %H:%M:%S.%L",
          date: "$timestamp"
        }
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, formatted: "2026/03/31 14:05:09.042" },
  { _id: 2, formatted: "2026/01/15 08:30:00.000" },
  { _id: 3, formatted: null }
]
```

### Example 3 - $dateToString with onNull

Provide a default string when the date field is null:

```javascript
db.events.aggregate([
  {
    $project: {
      dateStr: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$timestamp",
          onNull: "N/A"
        }
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, dateStr: "2026-03-31" },
  { _id: 2, dateStr: "2026-01-15" },
  { _id: 3, dateStr: "N/A" }
]
```

### Example 4 - $dateToString with Timezone

Convert UTC timestamp to US/Eastern time:

```javascript
db.events.aggregate([
  {
    $project: {
      localTime: {
        $dateToString: {
          format: "%Y-%m-%d %H:%M",
          date: "$timestamp",
          timezone: "America/New_York"
        }
      }
    }
  }
])
```

### Example 5 - Group by Date String

Group events by date (using `$dateToString` as the group key):

```javascript
db.events.aggregate([
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

Output:

```javascript
[
  { _id: null, count: 1 },
  { _id: "2026-01-15", count: 1 },
  { _id: "2026-03-31", count: 1 }
]
```

### Example 6 - $dateToParts

Break a timestamp into components:

```javascript
db.events.aggregate([
  {
    $project: {
      event: 1,
      parts: { $dateToParts: { date: "$timestamp" } }
    }
  }
])
```

Output:

```javascript
[
  {
    _id: 1,
    event: "Launch",
    parts: { year: 2026, month: 3, day: 31, hour: 14, minute: 5, second: 9, millisecond: 42 }
  },
  {
    _id: 2,
    event: "Update",
    parts: { year: 2026, month: 1, day: 15, hour: 8, minute: 30, second: 0, millisecond: 0 }
  },
  {
    _id: 3,
    event: "Archive",
    parts: null
  }
]
```

### Example 7 - $dateToParts Components for Filtering

Extract the `month` part and group events by month:

```javascript
db.events.aggregate([
  { $match: { timestamp: { $ne: null } } },
  {
    $group: {
      _id: {
        year:  { $year: "$timestamp" },
        month: { $month: "$timestamp" }
      },
      count: { $sum: 1 }
    }
  }
])
```

Note: `$year`, `$month`, `$dayOfMonth`, `$hour`, etc. are direct date extraction operators that are often simpler alternatives to `$dateToParts`.

### Example 8 - $dateToParts with iso8601

Get ISO week number and ISO weekday:

```javascript
db.events.aggregate([
  {
    $project: {
      isoParts: {
        $dateToParts: {
          date: "$timestamp",
          iso8601: true
        }
      }
    }
  }
])
```

Output (ISO 8601 fields include `isoWeekYear`, `isoWeek`, `isoDayOfWeek`):

```javascript
[
  { _id: 1, isoParts: { isoWeekYear: 2026, isoWeek: 14, isoDayOfWeek: 2, hour: 14, minute: 5, second: 9, millisecond: 42 } }
]
```

## Use Cases

- Formatting dates for display or export (e.g., CSV, API responses)
- Grouping events by day, week, month, or year
- Extracting date components for conditional logic or custom time bucketing
- Timezone-aware date formatting for localized reports

## Summary

`$dateToString` converts a MongoDB date to a formatted string using `strftime`-style format specifiers, with optional timezone conversion and null handling. `$dateToParts` breaks a date into named numeric components (`year`, `month`, `day`, etc.), which is useful for arithmetic or grouping on specific date parts. For simple date-part extraction in `$group`, direct operators like `$year` and `$month` are often more concise.
