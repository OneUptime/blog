# How to Calculate Distance with $geoNear in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, $geoNear, Aggregation, Distance

Description: Use the $geoNear aggregation stage to find nearby documents and compute the exact distance from a reference point, enabling rich location-based queries and analytics.

---

## What Is $geoNear?

`$geoNear` is an aggregation pipeline stage that:
1. Finds documents near a specified point (like `$near`)
2. Adds a computed distance field to each document
3. Returns results sorted by distance (nearest first)

Unlike `$near` in a `find()` query, `$geoNear` gives you the actual distance value in results, which is essential for displaying "2.3 km away" to users or filtering by distance in later pipeline stages.

## Requirements

- Must be the FIRST stage in the aggregation pipeline
- Requires a `2dsphere` or `2d` index on the location field
- Cannot use `$geoNear` if there are multiple geospatial indexes on the collection (specify `key` to disambiguate)

## Step 1: Set Up Data

```javascript
db.venues.createIndex({ location: "2dsphere" })

db.venues.insertMany([
  {
    name: "Madison Square Garden",
    type: "arena",
    location: { type: "Point", coordinates: [-73.9930, 40.7505] },
    capacity: 20000
  },
  {
    name: "Bryant Park",
    type: "park",
    location: { type: "Point", coordinates: [-73.9842, 40.7536] },
    capacity: 5000
  },
  {
    name: "Grand Central Terminal",
    type: "transport",
    location: { type: "Point", coordinates: [-73.9772, 40.7527] },
    capacity: null
  },
  {
    name: "The High Line",
    type: "park",
    location: { type: "Point", coordinates: [-74.0047, 40.7480] },
    capacity: null
  }
])
```

## Step 2: Basic $geoNear

```javascript
db.venues.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceMeters",   // New field added to each result
      spherical: true                    // Use spherical geometry (Earth)
    }
  }
])
```

Output includes `distanceMeters` in each document:

```json
{ "name": "Bryant Park", "distanceMeters": 456.2, ... }
{ "name": "Grand Central Terminal", "distanceMeters": 891.5, ... }
{ "name": "Madison Square Garden", "distanceMeters": 1012.3, ... }
```

## Step 3: Limit Distance and Results

```javascript
db.venues.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceMeters",
      maxDistance: 2000,    // Maximum 2000 meters
      minDistance: 100,     // Minimum 100 meters
      spherical: true
    }
  },
  { $limit: 5 }            // Return at most 5 documents
])
```

## Step 4: Add Additional Match Criteria

Use `query` to pre-filter documents before distance calculation:

```javascript
db.venues.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceMeters",
      maxDistance: 3000,
      query: { type: "park" },   // Only consider parks
      spherical: true
    }
  }
])
```

## Step 5: Use distanceMultiplier to Convert Units

Convert meters to kilometers or miles:

```javascript
db.venues.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceKm",
      distanceMultiplier: 0.001,   // meters * 0.001 = kilometers
      spherical: true
    }
  },
  {
    $project: {
      name: 1,
      type: 1,
      distanceKm: { $round: ["$distanceKm", 2] }
    }
  }
])
```

For miles: `distanceMultiplier: 0.000621371` (1 meter = 0.000621371 miles)

## Step 6: Pipeline After $geoNear

Chain additional stages after `$geoNear` for rich queries:

```javascript
// Find nearest 20 venues, group by type, get average distance per type
db.venues.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceMeters",
      maxDistance: 5000,
      spherical: true
    }
  },
  { $limit: 20 },
  {
    $group: {
      _id: "$type",
      count: { $sum: 1 },
      avgDistanceMeters: { $avg: "$distanceMeters" },
      nearest: { $first: "$name" },
      nearestDistance: { $first: "$distanceMeters" }
    }
  },
  { $sort: { avgDistanceMeters: 1 } }
])
```

## Step 7: Add Walking/Driving Time Estimates

```javascript
db.venues.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceMeters",
      maxDistance: 3000,
      spherical: true
    }
  },
  {
    $addFields: {
      distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] },
      // Estimate walking time: average walking speed ~5km/h
      walkingMinutes: {
        $round: [{
          $divide: [
            { $divide: ["$distanceMeters", 1000] },  // km
            { $divide: [5, 60] }                      // 5 km/h in km/min
          ]
        }, 0]
      }
    }
  },
  {
    $project: {
      name: 1,
      type: 1,
      distanceKm: 1,
      walkingMinutes: 1
    }
  }
])
```

## Step 8: Specify Index Key for Ambiguity

When a collection has multiple geospatial indexes, specify which to use:

```javascript
db.venues.createIndex({ location: "2dsphere" })
db.venues.createIndex({ secondaryLocation: "2dsphere" })

db.venues.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceMeters",
      key: "location",   // Specify which index to use
      spherical: true
    }
  }
])
```

## Node.js Example

```javascript
async function getNearbyVenues(lng, lat, options = {}) {
  const { maxDistance = 2000, type = null, limit = 10 } = options;

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance,
        spherical: true,
        ...(type && { query: { type } })
      }
    },
    { $limit: limit },
    {
      $project: {
        name: 1, type: 1, capacity: 1,
        distanceMeters: { $round: ["$distanceMeters", 0] }
      }
    }
  ];

  const results = await client.db("myapp")
    .collection("venues")
    .aggregate(pipeline)
    .toArray();

  await client.close();
  return results;
}

const parks = await getNearbyVenues(-73.9857, 40.7484, { type: "park", maxDistance: 3000 });
parks.forEach(p => console.log(`${p.name} - ${p.distanceMeters}m away`));
```

## Summary

`$geoNear` must be the first aggregation stage and returns documents sorted by proximity from a specified point with a computed distance field. Use `distanceField` to name the added field, `maxDistance` and `minDistance` to constrain the search radius, `query` to pre-filter documents, and `distanceMultiplier` to convert meters to kilometers or miles. Chain additional pipeline stages after `$geoNear` to group by type, compute time estimates, or further filter results.
