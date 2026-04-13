# How to Handle Recurring Events in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scheduling, Recurrence, Date, Aggregation

Description: Learn how to store and query recurring events in MongoDB using recurrence rules, virtual instance expansion, and efficient date-based indexing patterns.

---

## Modeling Recurring Events

Recurring events are a common challenge because they can span years with potentially thousands of occurrences. Two main approaches exist: store a recurrence rule and expand occurrences on the fly, or pre-materialize occurrences up to a horizon.

A recurrence rule approach keeps storage minimal:

```javascript
{
  _id: ObjectId("..."),
  title: "Weekly Team Standup",
  ownerId: "user-123",
  recurrence: {
    frequency: "weekly",      // "daily" | "weekly" | "monthly" | "yearly"
    interval: 1,              // every 1 week
    daysOfWeek: [1, 2, 3, 4, 5],  // Monday-Friday
    startDate: ISODate("2026-01-06T09:00:00Z"),
    endDate:   ISODate("2026-12-31T00:00:00Z"),
    exceptions: [
      ISODate("2026-04-07T09:00:00Z")  // skip this date
    ]
  },
  duration: 30,   // minutes
  timezone: "America/New_York"
}
```

## Expanding Recurrence Rules in Application Code

For date range queries, expand the rule in application code:

```javascript
function expandOccurrences(event, rangeStart, rangeEnd) {
  const { recurrence, duration } = event;
  const occurrences = [];
  let current = new Date(recurrence.startDate);

  while (current <= rangeEnd) {
    const isException = recurrence.exceptions?.some(
      (ex) => ex.getTime() === current.getTime()
    );

    const inRange = current >= rangeStart && current <= rangeEnd;
    const dayMatch = !recurrence.daysOfWeek ||
      recurrence.daysOfWeek.includes(current.getDay());

    if (inRange && !isException && dayMatch) {
      occurrences.push({
        eventId: event._id,
        title: event.title,
        start: new Date(current),
        end: new Date(current.getTime() + duration * 60 * 1000)
      });
    }

    // Advance by interval
    if (recurrence.frequency === "daily") current.setDate(current.getDate() + recurrence.interval);
    else if (recurrence.frequency === "weekly") current.setDate(current.getDate() + 1);
    else if (recurrence.frequency === "monthly") current.setMonth(current.getMonth() + recurrence.interval);
    else if (recurrence.frequency === "yearly") current.setFullYear(current.getFullYear() + recurrence.interval);

    if (recurrence.endDate && current > recurrence.endDate) break;
  }
  return occurrences;
}
```

## Pre-Materializing Occurrences for Fast Queries

For calendars with complex queries (e.g., "show all events on a specific day"), pre-materializing occurrences as separate documents enables indexed lookups:

```javascript
// Materialized occurrence document
{
  _id: ObjectId("..."),
  eventId: ObjectId("..."),
  title: "Weekly Team Standup",
  start: ISODate("2026-04-07T13:00:00Z"),  // UTC
  end:   ISODate("2026-04-07T13:30:00Z"),
  ownerId: "user-123",
  cancelled: false
}

// Index for efficient range queries
db.occurrences.createIndex({ ownerId: 1, start: 1 });
db.occurrences.createIndex({ eventId: 1, start: 1 });
```

Query a user's events for a day:

```javascript
const dayStart = new Date("2026-04-07T00:00:00Z");
const dayEnd   = new Date("2026-04-07T23:59:59Z");

const events = await db.collection("occurrences").find({
  ownerId: "user-123",
  start: { $gte: dayStart, $lte: dayEnd },
  cancelled: false
}).sort({ start: 1 }).toArray();
```

## Handling Exceptions and Modifications

Track per-occurrence overrides to allow editing a single instance of a recurring series:

```javascript
// Mark one occurrence as cancelled
await db.collection("occurrences").updateOne(
  { eventId: eventId, start: new Date("2026-04-14T13:00:00Z") },
  { $set: { cancelled: true } }
);

// Modify one occurrence (reschedule)
await db.collection("occurrences").updateOne(
  { eventId: eventId, start: originalStart },
  { $set: { start: newStart, end: newEnd, modified: true } }
);
```

## Aggregating Upcoming Events

```javascript
// Count events per day for the next 7 days
const start = new Date();
const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

db.collection("occurrences").aggregate([
  { $match: { ownerId: "user-123", start: { $gte: start, $lt: end }, cancelled: false } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$start" } },
      count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]).toArray();
```

## Summary

Recurring events in MongoDB can be stored as recurrence rules (compact, flexible) or pre-materialized as individual occurrence documents (fast queries, easy modification). For most calendar applications, pre-materializing occurrences within a rolling window (e.g., 6-12 months ahead) and using compound indexes on `ownerId + start` provides the best query performance. Handle exceptions and per-occurrence modifications by updating individual occurrence documents rather than the parent rule.
