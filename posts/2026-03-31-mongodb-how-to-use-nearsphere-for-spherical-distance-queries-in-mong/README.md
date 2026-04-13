# How to Use $nearSphere for Spherical Distance Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, $nearSphere, Spherical Distance, Location Queries

Description: Use MongoDB's $nearSphere operator to query documents by spherical distance from a point, and understand when to use it versus the modern $near with $geometry approach.

---

## What Is $nearSphere?

`$nearSphere` calculates distances using spherical geometry (treating Earth as a sphere), returning documents sorted by distance from a given point. It works with both `2dsphere` and `2d` indexes.

`$nearSphere` is not deprecated, but for new applications using `2dsphere` indexes, `$near` with `$geometry` provides equivalent spherical geometry and is the more commonly used approach. However, `$nearSphere` remains the only way to perform spherical distance calculations when working with `2d` indexes and legacy coordinate pairs.

## $nearSphere vs $near

| Feature | `$near` + `$geometry` | `$nearSphere` |
|---|---|---|
| Index type | `2dsphere` | `2dsphere` or `2d` |
| Distance unit (`$maxDistance`) | Meters | Meters (2dsphere) or Radians (2d) |
| Geometry type | GeoJSON | GeoJSON or legacy coordinate pairs |
| Recommended | Yes (new apps) | When using `2d` indexes |

## Basic $nearSphere with 2dsphere Index

```javascript
// Ensure 2dsphere index exists
db.locations.createIndex({ position: "2dsphere" })

// Documents use GeoJSON Point format
db.locations.insertMany([
  { name: "Central Park", position: { type: "Point", coordinates: [-73.9654, 40.7851] } },
  { name: "Times Square", position: { type: "Point", coordinates: [-73.9855, 40.7580] } },
  { name: "Brooklyn Bridge", position: { type: "Point", coordinates: [-73.9969, 40.7061] } }
])

// $nearSphere with GeoJSON geometry (meters)
db.locations.find({
  position: {
    $nearSphere: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9857, 40.7484]
      },
      $maxDistance: 3000   // 3km in meters
    }
  }
})
```

## $nearSphere with a 2d Index (Legacy Coordinates)

For collections using legacy coordinate pairs (not GeoJSON):

```javascript
// Legacy document format
db.stores.insertMany([
  { name: "Store A", loc: [-73.9857, 40.7484] },
  { name: "Store B", loc: [-73.9951, 40.7589] }
])

// Create 2d index on legacy coordinate field
db.stores.createIndex({ loc: "2d" })

// $nearSphere with legacy coordinates uses RADIANS for maxDistance
// 1 radian = ~6371km
// 1km = 1/6371 radians = 0.000157 radians

const radiusKm = 2;
const radiusRadians = radiusKm / 6371;

db.stores.find({
  loc: {
    $nearSphere: [-73.9857, 40.7484],
    $maxDistance: radiusRadians
  }
})
```

## $nearSphere with Both Min and Max Distance

```javascript
// Find locations between 500m and 5km away
db.locations.find({
  position: {
    $nearSphere: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9857, 40.7484]
      },
      $minDistance: 500,
      $maxDistance: 5000
    }
  }
}).limit(20)
```

## Using $nearSphere in Aggregation with Distance

`$nearSphere` in `find()` doesn't return the distance value. Use `$geoNear` in aggregation:

```javascript
db.locations.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceMeters",
      spherical: true,   // Makes $geoNear use spherical calculation (like $nearSphere)
      maxDistance: 5000
    }
  },
  { $sort: { distanceMeters: 1 } },
  {
    $project: {
      name: 1,
      distanceMeters: { $round: ["$distanceMeters", 0] },
      distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] }
    }
  }
])
```

## Node.js Example: Nearby Search with $nearSphere

```javascript
const { MongoClient } = require('mongodb');

async function findNearby(longitude, latitude, maxDistanceMeters) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const collection = client.db('myapp').collection('locations');

  const results = await collection.find({
    position: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceMeters
      }
    }
  }).limit(10).toArray();

  await client.close();
  return results;
}

findNearby(-73.9857, 40.7484, 2000)
  .then(results => results.forEach(r => console.log(r.name)));
```

## Python Example

```python
from pymongo import MongoClient, GEOSPHERE
import os

client = MongoClient(os.environ["MONGODB_URI"])
collection = client["myapp"]["locations"]

collection.create_index([("position", GEOSPHERE)])

user_location = [-73.9857, 40.7484]  # [longitude, latitude]

# $nearSphere with GeoJSON geometry
results = collection.find({
    "position": {
        "$nearSphere": {
            "$geometry": {
                "type": "Point",
                "coordinates": user_location
            },
            "$maxDistance": 2000
        }
    }
}).limit(10)

for doc in results:
    print(doc["name"])
```

## When to Use $nearSphere vs $near

Use `$nearSphere` when:
- Working with existing code that uses `$nearSphere`
- Using a `2d` index with legacy coordinate pairs and needing spherical distance
- Migrating legacy code where changing the operator is impractical

Use `$near` with `$geometry` (preferred) when:
- Writing new code
- Using `2dsphere` indexes with GeoJSON
- You want the most readable and modern syntax

## Summary

`$nearSphere` returns documents sorted by spherical (great-circle) distance from a point, supporting both `2dsphere` indexes with GeoJSON geometry and `2d` indexes with legacy coordinate pairs. When using `2dsphere` with `$geometry`, distances are in meters. When using `2d` without `$geometry`, distances are in radians. For new applications, prefer the equivalent `$near` with `$geometry` syntax, and use `$geoNear` in aggregation pipelines when the computed distance value is needed in results.
