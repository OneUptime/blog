# How to Handle Time Zones in MongoDB Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Zone, Date, Aggregation, Query

Description: Learn how to handle time zones in MongoDB queries by storing dates in UTC, converting with $dateToString, and grouping by local time using timezone parameters.

---

MongoDB stores all dates as UTC internally. Time zone handling is the application's responsibility at read time. MongoDB's aggregation pipeline provides built-in support for converting UTC dates to local time zones for display, grouping, and filtering.

## Always Store Dates in UTC

Regardless of the user's time zone, always insert dates as UTC.

```javascript
db.events.insertOne({
  title: "Team Standup",
  startAt: new Date("2026-03-31T14:00:00Z"),  // UTC
  timezone: "America/Chicago"                   // user's local zone
});
```

Storing the user's time zone separately lets you convert back to local time at read time without ambiguity.

## Converting UTC to Local Time with $dateToString

Use `$dateToString` with a `timezone` parameter to display dates in a specific time zone.

```javascript
db.events.aggregate([
  {
    $project: {
      title: 1,
      localStart: {
        $dateToString: {
          format: "%Y-%m-%d %H:%M",
          date: "$startAt",
          timezone: "America/Chicago"
        }
      }
    }
  }
]);
```

Valid timezone values are IANA time zone names such as `"America/New_York"` or UTC offsets like `"+05:30"`.

## Using a Per-Document Timezone Field

When each document stores its own time zone, reference the field directly in the `timezone` parameter.

```javascript
db.events.aggregate([
  {
    $project: {
      title: 1,
      localStart: {
        $dateToString: {
          format: "%Y-%m-%dT%H:%M:00",
          date: "$startAt",
          timezone: "$timezone"
        }
      }
    }
  }
]);
```

## Grouping by Local Day

Group events by calendar day in a specific time zone rather than UTC day. UTC midnight does not align with local midnight for most users.

```javascript
db.events.aggregate([
  {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$startAt",
          timezone: "America/Chicago"
        }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Filtering by Local Date Range

When a user queries "all events on March 31 in Chicago", convert their local range to UTC before querying.

```javascript
// Local: 2026-03-31 00:00 Chicago = UTC 2026-03-31T05:00:00Z (UTC-5, CDT)
// Local: 2026-04-01 00:00 Chicago = UTC 2026-04-01T05:00:00Z

db.events.find({
  startAt: {
    $gte: new Date("2026-03-31T05:00:00Z"),
    $lt: new Date("2026-04-01T05:00:00Z")
  }
});
```

Perform this conversion in the application layer using a library like `date-fns-tz` (Node.js) or `pytz` (Python).

```javascript
const { fromZonedTime } = require("date-fns-tz");
const tz = "America/Chicago";
const start = fromZonedTime("2026-03-31 00:00:00", tz);
const end = fromZonedTime("2026-04-01 00:00:00", tz);
```

## Extracting Date Parts in Local Time

Use `$dateToParts` with a timezone to extract year, month, day, and hour in local time.

```javascript
db.events.aggregate([
  {
    $project: {
      parts: {
        $dateToParts: {
          date: "$startAt",
          timezone: "America/Chicago"
        }
      }
    }
  }
]);
```

## Summary

MongoDB stores all dates in UTC and provides the `timezone` parameter in aggregation operators like `$dateToString` and `$dateToParts` to convert to local time at query time. Always insert UTC, store the user's time zone as a string field, and convert UTC range queries in the application layer before passing them to MongoDB. Group by local day using `$dateToString` with a timezone parameter rather than truncating the UTC timestamp.
