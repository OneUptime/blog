# How to Handle Overlapping Time Ranges in MongoDB Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Date, Query, Index, Scheduling

Description: Learn how to query overlapping time ranges in MongoDB using the correct interval intersection condition with compound indexes for efficient scheduling queries.

---

## The Interval Intersection Problem

Two time intervals A and B overlap when:

```text
A.start < B.end  AND  A.end > B.start
```

This is Allen's Interval Algebra overlap condition. Any other comparison (checking only one boundary) produces false negatives or false positives. This formula works for checking whether a new booking conflicts with existing ones.

## Detecting Conflicts Before Booking

Before inserting a new appointment, check for conflicts:

```javascript
async function hasConflict(providerId, newStart, newEnd) {
  const conflict = await db.collection("appointments").findOne({
    providerId,
    status: { $in: ["confirmed", "pending"] },
    start: { $lt: newEnd },    // existing start is before new end
    end:   { $gt: newStart }   // existing end is after new start
  });
  return conflict !== null;
}

// Usage
const newStart = new Date("2026-04-01T10:00:00Z");
const newEnd   = new Date("2026-04-01T10:30:00Z");

if (await hasConflict("dr-smith", newStart, newEnd)) {
  throw new Error("Time slot conflicts with an existing appointment");
}
```

## Atomic Conflict Check and Insert

For concurrent booking systems, combine the conflict check and insert atomically in a transaction:

```javascript
async function createAppointment(providerId, patientId, start, end) {
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const conflict = await db.collection("appointments").findOne(
        {
          providerId,
          status: { $in: ["confirmed", "pending"] },
          start: { $lt: end },
          end:   { $gt: start }
        },
        { session }
      );
      if (conflict) throw new Error("Conflict with existing appointment");

      result = await db.collection("appointments").insertOne(
        { providerId, patientId, start, end, status: "confirmed", createdAt: new Date() },
        { session }
      );
    });
    return result.insertedId;
  } finally {
    await session.endSession();
  }
}
```

## Efficient Indexing for Range Overlap Queries

A compound index on `(providerId, start, end)` allows MongoDB to efficiently prune candidates:

```javascript
db.appointments.createIndex({ providerId: 1, start: 1, end: 1 });
```

The query `{ providerId, start: { $lt: end }, end: { $gt: start } }` uses the `providerId` and `start` parts of the index to narrow the candidate set, then filters on `end` in memory. This is significantly faster than a collection scan.

Verify with `explain`:

```javascript
db.appointments.find({
  providerId: "dr-smith",
  start: { $lt: new Date("2026-04-01T11:00:00Z") },
  end:   { $gt: new Date("2026-04-01T10:00:00Z") }
}).explain("executionStats");
```

Look for `IXSCAN` (not `COLLSCAN`) in the winning plan.

## Finding All Events That Overlap a Range

Retrieve all appointments overlapping a given time window - useful for calendar views:

```javascript
async function getOverlappingEvents(providerId, windowStart, windowEnd) {
  return db.collection("appointments").find({
    providerId,
    start: { $lt: windowEnd },
    end:   { $gt: windowStart }
  }).sort({ start: 1 }).toArray();
}
```

## Edge Cases to Handle

```text
Case                         start < end?   Overlaps?
---------------------------  ------------   ---------
Same start and end           A.start=B.end  No (end is exclusive)
One inside the other         Yes            Yes
Touching boundaries only     A.end=B.start  No (end is exclusive)
Complete overlap             Yes            Yes
```

If your system uses inclusive end times, adjust the condition to:

```javascript
// Inclusive ends: both endpoints included
start: { $lte: end },
end:   { $gte: start }
```

Be consistent in your schema about whether `end` is exclusive (common for time slots) or inclusive.

## Aggregation for Busy Periods

Count how many appointments start in each hour to find busy time slots:

```javascript
db.collection("appointments").aggregate([
  { $match: { providerId: "dr-smith", status: "confirmed" } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m-%dT%H:00", date: "$start" } },
      count: { $sum: 1 }
  }},
  { $match: { count: { $gt: 2 } } },
  { $sort: { _id: 1 } }
])
```

## Summary

Handling overlapping time ranges in MongoDB requires using the correct interval intersection condition: `start < rangeEnd AND end > rangeStart`. A compound index on `(providerId, start, end)` makes these queries efficient. For conflict-safe bookings, wrap the check and insert in a transaction. Be explicit about whether end times are inclusive or exclusive, and use `explain()` to confirm index usage on range queries.
