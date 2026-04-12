# How to Handle Time Zone-Aware Scheduling in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Timezone, Scheduling, Date, Aggregation

Description: Learn how to store, query, and display time zone-aware scheduled events in MongoDB, handling DST transitions and multi-region calendar scenarios correctly.

---

## The Golden Rule: Store in UTC

MongoDB stores all dates as UTC internally. Always insert dates in UTC and convert to local time zones in your application or using MongoDB's aggregation date operators. Never store local time strings as the source of truth.

```javascript
// CORRECT - store as UTC
await db.collection("meetings").insertOne({
  title: "Product Review",
  startUtc: new Date("2026-04-01T14:00:00Z"),  // UTC
  timezone: "America/New_York",                  // store the IANA zone
  durationMinutes: 60
});

// WRONG - do not store local time without zone
// start: "2026-04-01T10:00:00"  <- ambiguous!
```

## Querying Across Time Zones

When users search for events "today" in their local timezone, convert the local date range to UTC before querying:

```javascript
// Node.js with the `luxon` library
const { DateTime } = require("luxon");

function getDayRangeUtc(dateStr, timezone) {
  const start = DateTime.fromISO(dateStr, { zone: timezone }).startOf("day");
  const end   = start.endOf("day");
  return { start: start.toJSDate(), end: end.toJSDate() };
}

const { start, end } = getDayRangeUtc("2026-04-01", "America/New_York");

const meetings = await db.collection("meetings").find({
  startUtc: { $gte: start, $lt: end }
}).toArray();
```

## Using MongoDB Aggregation with Timezone

MongoDB's `$dateToString` and `$dateToParts` operators accept a `timezone` parameter for display:

```javascript
db.collection("meetings").aggregate([
  { $match: { startUtc: { $gte: new Date("2026-04-01T00:00:00Z"), $lt: new Date("2026-04-02T00:00:00Z") } } },
  {
    $project: {
      title: 1,
      localStart: {
        $dateToString: {
          format: "%Y-%m-%d %H:%M",
          date: "$startUtc",
          timezone: "$timezone"
        }
      },
      hour: {
        $dateToParts: {
          date: "$startUtc",
          timezone: "$timezone"
        }
      }
    }
  }
])
```

## Handling Daylight Saving Time Transitions

DST transitions are the primary source of scheduling bugs. When a user books a recurring weekly meeting at "10 AM New York", the UTC offset changes between EST (-5) and EDT (-4):

```javascript
const { DateTime } = require("luxon");

function nextOccurrenceUtc(localTimeStr, timezone, weeksAhead = 1) {
  const now = DateTime.now().setZone(timezone);
  const [hour, minute] = localTimeStr.split(":").map(Number);

  // Compute next occurrence in local wall clock time - DST is handled automatically
  let next = now.set({ hour, minute, second: 0, millisecond: 0 });
  if (next <= now) next = next.plus({ weeks: weeksAhead });

  return next.toUTC().toJSDate();  // Convert to UTC for storage
}

const nextUtc = nextOccurrenceUtc("10:00", "America/New_York");
```

Luxon (and similar libraries like `date-fns-tz`, Python's `zoneinfo`) handle DST automatically when you work in named IANA zones rather than UTC offsets.

## Multi-Region Event Availability

For systems where users from different time zones must find overlapping availability:

```javascript
// Find meetings where a user in "Europe/London" and "America/Chicago" both have availability
// Convert each user's local business hours (9-17) to UTC
function businessHoursUtc(date, timezone) {
  const { DateTime } = require("luxon");
  const start = DateTime.fromISO(date, { zone: timezone }).set({ hour: 9,  minute: 0 });
  const end   = DateTime.fromISO(date, { zone: timezone }).set({ hour: 17, minute: 0 });
  return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
}

const london  = businessHoursUtc("2026-04-01", "Europe/London");
const chicago = businessHoursUtc("2026-04-01", "America/Chicago");

// Overlap window
const overlapStart = new Date(Math.max(london.start, chicago.start));
const overlapEnd   = new Date(Math.min(london.end,   chicago.end));
```

## Indexing for Timezone-Aware Queries

Always index the UTC date field:

```javascript
db.meetings.createIndex({ startUtc: 1 });
db.meetings.createIndex({ ownerId: 1, startUtc: 1 });
```

Never index local time strings - they cannot be compared correctly across DST transitions.

## Summary

Time zone-aware scheduling in MongoDB follows a simple rule: store all dates as UTC with the IANA timezone name alongside, query by converting local ranges to UTC, and display by converting UTC back to local time using `$dateToString` with a `timezone` parameter or a library like Luxon. This approach correctly handles DST transitions, multi-region scheduling, and ensures all date comparisons are unambiguous.
