# How to Use $near to Find Nearby Locations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, $near, Location Queries, Proximity Search

Description: Use MongoDB's $near operator to find documents sorted by proximity to a given location, with optional minimum and maximum distance constraints.

---

## What Is $near?

`$near` is a geospatial query operator that returns documents ordered by distance from a specified point (nearest first). It requires a `2dsphere` or `2d` index.

Key characteristics:
- Results are automatically sorted by distance (closest first)
- Supports `$maxDistance` and `$minDistance` constraints
- Uses spherical geometry with `$geometry` (GeoJSON) + `2dsphere` index
- Uses flat geometry with `[x, y]` coordinates + `2d` index

## Prerequisites

A `2dsphere` index on the location field:

```javascript
db.restaurants.createIndex({ location: "2dsphere" })
```

Documents with GeoJSON Points:

```javascript
db.restaurants.insertMany([
  { name: "Cafe Nero", location: { type: "Point", coordinates: [-0.1278, 51.5074] }, type: "cafe" },
  { name: "Burger Barn", location: { type: "Point", coordinates: [-0.1350, 51.5100] }, type: "burger" },
  { name: "Sushi Stop", location: { type: "Point", coordinates: [-0.1200, 51.5050] }, type: "sushi" }
])
```

## Basic $near Query

```javascript
// Find restaurants near a location (sorted by distance)
db.restaurants.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-0.1278, 51.5074]  // [longitude, latitude]
      }
    }
  }
})
```

## $near with Distance Constraints

```javascript
// Find restaurants within 500m to 2km from a point
db.restaurants.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-0.1278, 51.5074]
      },
      $minDistance: 500,    // At least 500 meters away
      $maxDistance: 2000    // No more than 2000 meters away
    }
  }
})
```

Distances are in meters when using `$geometry` (spherical/GeoJSON mode).

## Add Computed Distance Field with $geoNear

`$near` doesn't include the distance in results. Use `$geoNear` in an aggregation pipeline to get distance:

```javascript
db.restaurants.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-0.1278, 51.5074] },
      distanceField: "distanceMeters",  // Adds this field to results
      maxDistance: 2000,
      spherical: true
    }
  },
  {
    $project: {
      name: 1,
      type: 1,
      distanceMeters: { $round: ["$distanceMeters", 0] }
    }
  }
])
```

Output:
```json
{ "name": "Cafe Nero", "type": "cafe", "distanceMeters": 0 }
{ "name": "Sushi Stop", "type": "sushi", "distanceMeters": 374 }
{ "name": "Burger Barn", "type": "burger", "distanceMeters": 742 }
```

## Combine $near with Other Filters

`$near` must be the only geospatial operator in a query, but you can add non-geospatial conditions:

```javascript
// Find only cafes within 1km
db.restaurants.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-0.1278, 51.5074] },
      $maxDistance: 1000
    }
  },
  type: "cafe"
})
```

## Limit Results

Get only the 5 nearest locations:

```javascript
db.restaurants.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-0.1278, 51.5074] },
      $maxDistance: 5000
    }
  }
}).limit(5)
```

## Node.js Example: "Find Restaurants Near Me"

```javascript
async function findNearby(userLng, userLat, maxDistanceMeters = 1000, limit = 10) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const results = await client.db('myapp').collection('restaurants').aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [userLng, userLat] },
        distanceField: "distance",
        maxDistance: maxDistanceMeters,
        spherical: true
      }
    },
    { $limit: limit },
    {
      $project: {
        name: 1,
        type: 1,
        rating: 1,
        distanceMeters: { $round: ["$distance", 0] }
      }
    }
  ]).toArray();

  await client.close();
  return results;
}

// Find 10 restaurants within 500m
const nearby = await findNearby(-0.1278, 51.5074, 500, 10);
nearby.forEach(r => console.log(`${r.name} - ${r.distanceMeters}m away`));
```

## Python Example

```python
from pymongo import MongoClient, GEOSPHERE
import os

client = MongoClient(os.environ["MONGODB_URI"])
collection = client["myapp"]["restaurants"]

# Ensure index exists
collection.create_index([("location", GEOSPHERE)])

user_coords = [-0.1278, 51.5074]  # [longitude, latitude]

results = collection.find({
    "location": {
        "$near": {
            "$geometry": {
                "type": "Point",
                "coordinates": user_coords
            },
            "$maxDistance": 1000
        }
    }
}).limit(10)

for r in results:
    print(f"{r['name']} - {r['type']}")
```

## $near vs $nearSphere

- **`$near` with `$geometry`**: Uses spherical calculation (meters) - recommended for real-world coordinates
- **`$near` without `$geometry`** (with `2d` index): Uses flat calculation (degrees)
- **`$nearSphere`**: Always uses spherical calculation; with GeoJSON + `2dsphere` index, behaves identically to `$near` with `$geometry`

```javascript
// Modern approach (use this)
{ $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 1000 } }

// Alternative with legacy coordinates (uses spherical math, distance in radians)
{ $nearSphere: [lng, lat], $maxDistance: 0.009 }  // radians
```

## Summary

`$near` with `$geometry` returns documents sorted by proximity to a GeoJSON point using spherical (meters) distance calculation. Specify `$maxDistance` and `$minDistance` in meters to limit results by range, combine with non-geospatial filters for refined queries, and use `$geoNear` in aggregation pipelines when you need the computed distance value in results. Always use a `2dsphere` index and store coordinates as `[longitude, latitude]` in GeoJSON format.
