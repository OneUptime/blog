# How to Use $geoNear to Find Documents by Proximity in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $geoNear, Geospatial, Proximity Queries, NoSQL

Description: Learn how to use MongoDB's $geoNear aggregation stage to find and sort documents by their distance from a geographic point, with distance added to each result.

---

## What Is the $geoNear Stage?

The `$geoNear` stage outputs documents sorted by proximity to a given point. It also adds the distance to each document in a specified field. This stage requires a geospatial index (`2dsphere` for spherical geometry or `2d` for planar geometry).

```javascript
{
  $geoNear: {
    near: { type: "Point", coordinates: [longitude, latitude] },
    distanceField: "distance",
    maxDistance: 5000,          // in meters (for 2dsphere)
    minDistance: 100,           // optional
    query: {},                  // optional additional filter
    spherical: true,            // true for 2dsphere, false for 2d
    distanceMultiplier: 1,      // optional: multiplier for distance
    includeLocs: "locField"     // optional: include matched location
  }
}
```

## Setup - Creating a 2dsphere Index

```javascript
db.restaurants.createIndex({ location: "2dsphere" })

// Insert sample data
db.restaurants.insertMany([
  { name: "Pizza Place", location: { type: "Point", coordinates: [-73.98, 40.76] }, cuisine: "Italian" },
  { name: "Sushi Bar",   location: { type: "Point", coordinates: [-73.97, 40.77] }, cuisine: "Japanese" },
  { name: "Taco Joint",  location: { type: "Point", coordinates: [-74.00, 40.74] }, cuisine: "Mexican" }
])
```

## Basic Proximity Query

Find restaurants within 2km of a location:

```javascript
db.restaurants.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.99, 40.75] },
      distanceField: "dist.calculated",
      maxDistance: 2000,  // 2000 meters
      spherical: true
    }
  }
])
```

Each result includes `dist.calculated` in meters.

## Converting Distance to Kilometers

Use `distanceMultiplier` to convert from meters to km:

```javascript
db.restaurants.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.99, 40.75] },
      distanceField: "distanceKm",
      maxDistance: 5000,
      distanceMultiplier: 0.001,  // meters to km
      spherical: true
    }
  }
])
```

## Adding a Query Filter

Combine proximity with other field conditions:

```javascript
db.restaurants.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.99, 40.75] },
      distanceField: "distance",
      maxDistance: 3000,
      query: { cuisine: "Italian", rating: { $gte: 4 } },
      spherical: true
    }
  }
])
```

## Limiting Results

Get the 5 nearest restaurants using a `$limit` stage after `$geoNear`:

```javascript
db.restaurants.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.99, 40.75] },
      distanceField: "distance",
      spherical: true
    }
  },
  { $limit: 5 }
])
```

## Including the Matched Location

For documents with multiple location fields, `includeLocs` shows which location was used:

```javascript
db.deliveryZones.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.99, 40.75] },
      distanceField: "distance",
      includeLocs: "matchedLocation",
      spherical: true
    }
  }
])
```

## $geoNear Must Be First Stage

`$geoNear` must be the first stage in an aggregation pipeline:

```javascript
// CORRECT
db.restaurants.aggregate([
  { $geoNear: { near: ..., distanceField: "dist", spherical: true } },
  { $match: { rating: { $gte: 4 } } },
  { $limit: 10 }
])

// WRONG - $geoNear must be first
db.restaurants.aggregate([
  { $match: { rating: { $gte: 4 } } },
  { $geoNear: { near: ..., distanceField: "dist", spherical: true } }
])
```

## Practical Use Case - Nearby Delivery Drivers

```javascript
function findNearbyDrivers(pickupCoords, maxRadiusMeters) {
  return db.drivers.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: pickupCoords },
        distanceField: "distanceToPickup",
        maxDistance: maxRadiusMeters,
        query: { available: true, vehicleType: "car" },
        spherical: true,
        distanceMultiplier: 0.001
      }
    },
    { $limit: 10 },
    {
      $project: {
        driverId: 1,
        name: 1,
        rating: 1,
        distanceKm: "$distanceToPickup"
      }
    }
  ]);
}
```

## Using Planar Geometry (2d Index)

For non-spherical coordinates (e.g., gaming maps, floor plans):

```javascript
db.gameObjects.createIndex({ position: "2d" })

db.gameObjects.aggregate([
  {
    $geoNear: {
      near: [500, 300],  // x, y coordinates
      distanceField: "dist",
      spherical: false
    }
  }
])
```

## Summary

The `$geoNear` stage is the most powerful geospatial aggregation tool in MongoDB, automatically sorting results by proximity and adding computed distance values to each document. Combined with query filters, distance multipliers, and downstream pipeline stages, it enables rich location-aware applications like nearby search, delivery routing, and geofencing.
