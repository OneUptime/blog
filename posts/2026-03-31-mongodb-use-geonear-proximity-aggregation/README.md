# How to Use $geoNear to Find Documents by Proximity in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Pipeline Stage, Geospatial

Description: Learn how to use MongoDB's $geoNear aggregation stage to find and rank documents by distance from a point, with support for filtering, distance calculation, and spherical geometry.

---

## What Is the $geoNear Stage?

The `$geoNear` stage returns documents sorted by proximity to a specified geographic point. It must be the first stage in the aggregation pipeline and requires a geospatial index (`2dsphere` for spherical calculations or `2d` for flat plane). `$geoNear` is more flexible than the `$near` query operator because it works within aggregation pipelines, allowing you to add further stages like `$group`, `$project`, and `$lookup` after the proximity query.

## Prerequisites

Create a `2dsphere` index on the location field.

```javascript
db.places.createIndex({ location: "2dsphere" })
```

Ensure documents store coordinates in GeoJSON format.

```javascript
db.places.insertOne({
  name: "Central Park",
  location: { type: "Point", coordinates: [-73.9654, 40.7829] }
})
```

## Basic Syntax

```javascript
db.collection.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [<longitude>, <latitude>] },
      distanceField: "<fieldName>",
      spherical: true,
      maxDistance: <meters>,
      query: { <additionalFilter> },
      distanceMultiplier: <number>
    }
  }
])
```

## Example: Find Restaurants Near a Point

```javascript
db.restaurants.aggregate([
  {
    $geoNear: {
      near: {
        type: "Point",
        coordinates: [-73.9857, 40.7484]  // Midtown Manhattan
      },
      distanceField: "distanceMeters",
      spherical: true,
      maxDistance: 1000  // 1km radius
    }
  }
])
// Returns restaurants within 1km, sorted nearest-first, with distanceMeters added
```

## Adding a Query Filter

```javascript
db.businesses.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-122.4194, 37.7749] },
      distanceField: "distance",
      spherical: true,
      query: { category: "coffee", isOpen: true },
      maxDistance: 500
    }
  }
])
```

## Converting Distance to Kilometers or Miles

Use `distanceMultiplier` to convert from meters.

```javascript
db.stores.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [2.3488, 48.8534] },
      distanceField: "distanceKm",
      spherical: true,
      distanceMultiplier: 0.001  // meters to kilometers
    }
  },
  { $project: { name: 1, distanceKm: { $round: ["$distanceKm", 2] } } }
])
```

For miles, use `distanceMultiplier: 0.000621371`.

## Chaining Aggregation Stages After $geoNear

```javascript
db.drivers.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [pickupLon, pickupLat] },
      distanceField: "distanceMeters",
      spherical: true,
      maxDistance: 5000,
      query: { status: "available" }
    }
  },
  { $limit: 5 },
  {
    $project: {
      driverName: 1,
      rating: 1,
      distanceKm: { $multiply: ["$distanceMeters", 0.001] }
    }
  }
])
// Find top 5 available drivers within 5km
```

## Using minDistance

```javascript
db.competitors.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [lon, lat] },
      distanceField: "distance",
      spherical: true,
      minDistance: 100,  // Exclude locations closer than 100m
      maxDistance: 2000
    }
  }
])
```

## Key Parameters Reference

| Parameter | Required | Description |
|-----------|----------|-------------|
| `near` | Yes | Point to measure distance from |
| `distanceField` | Yes | Output field for the computed distance |
| `spherical` | Recommended | Use Earth sphere geometry |
| `maxDistance` | No | Maximum distance in meters (for 2dsphere) |
| `minDistance` | No | Minimum distance in meters (for 2dsphere) |
| `query` | No | Additional filter on documents |
| `distanceMultiplier` | No | Multiply distance by this factor |

## Summary

The `$geoNear` stage enables proximity-based queries within MongoDB aggregation pipelines. Always place it first in the pipeline, ensure a `2dsphere` index exists on the location field, and use `distanceMultiplier` to convert distances to your preferred unit. Its integration with the full aggregation pipeline makes it far more powerful than the query-level `$near` operator.
