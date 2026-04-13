# How to Create a 2dsphere Geospatial Index in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Geospatial, 2dsphere, Location Queries

Description: Learn how to create a 2dsphere geospatial index in MongoDB for querying spherical earth coordinates using GeoJSON and location operators.

---

## Overview

A 2dsphere index in MongoDB supports queries for geometries on an earth-like sphere. It supports GeoJSON objects (Point, LineString, Polygon, etc.) and legacy coordinate pairs. Use a 2dsphere index when you need proximity searches, queries within a boundary, or geometry intersection queries.

## Creating a 2dsphere Index

```javascript
// Create a 2dsphere index on a location field
db.places.createIndex({ location: "2dsphere" })
```

Documents must store coordinates in GeoJSON format with the field containing a `type` and `coordinates`:

```javascript
db.places.insertMany([
  {
    name: "Central Park",
    location: {
      type: "Point",
      coordinates: [-73.9654, 40.7829]  // [longitude, latitude]
    }
  },
  {
    name: "Times Square",
    location: {
      type: "Point",
      coordinates: [-73.9855, 40.7580]
    }
  },
  {
    name: "Brooklyn Bridge",
    location: {
      type: "Point",
      coordinates: [-73.9969, 40.7061]
    }
  }
])
```

Note: GeoJSON coordinates are `[longitude, latitude]`, not `[latitude, longitude]`.

## $near - Find Documents Near a Point

```javascript
// Find places within 5km of a location, sorted by distance
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9857, 40.7484]  // Near Empire State Building
      },
      $maxDistance: 5000,   // 5000 meters = 5km
      $minDistance: 100     // Optional: minimum distance
    }
  }
})
```

## $geoWithin - Find Documents Inside a Polygon

```javascript
// Find all places within Manhattan
db.places.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.0479, 40.6829],
          [-73.9067, 40.6829],
          [-73.9067, 40.8820],
          [-74.0479, 40.8820],
          [-74.0479, 40.6829]   // Close the polygon - repeat first point
        ]]
      }
    }
  }
})
```

## $geoIntersects - Find Overlapping Geometries

```javascript
db.routes.createIndex({ path: "2dsphere" })

db.routes.find({
  path: {
    $geoIntersects: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.0, 40.7],
          [-73.9, 40.7],
          [-73.9, 40.8],
          [-74.0, 40.8],
          [-74.0, 40.7]
        ]]
      }
    }
  }
})
```

## $nearSphere - Spherical Distance Search

```javascript
// Using $nearSphere for spherical distance search (meters with GeoJSON)
db.places.find({
  location: {
    $nearSphere: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9857, 40.7484]
      },
      $maxDistance: 2000
    }
  }
})
```

## Practical Example - Nearby Restaurant Finder

```javascript
db.restaurants.createIndex({ location: "2dsphere" })

db.restaurants.insertMany([
  {
    name: "Pizza Palace",
    cuisine: "Italian",
    location: { type: "Point", coordinates: [-73.9950, 40.7505] }
  },
  {
    name: "Sushi World",
    cuisine: "Japanese",
    location: { type: "Point", coordinates: [-73.9870, 40.7550] }
  }
])

// Find Italian restaurants within 1km, sorted by proximity
db.restaurants.find({
  cuisine: "Italian",
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-73.9900, 40.7520] },
      $maxDistance: 1000
    }
  }
})
```

## Calculating Distance with $geoNear Aggregation

```javascript
db.places.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distanceMeters",
      maxDistance: 5000,
      spherical: true,
      query: { category: "park" }
    }
  },
  {
    $project: {
      name: 1,
      distanceMeters: { $round: ["$distanceMeters", 0] },
      distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] }
    }
  }
])
```

## Summary

A 2dsphere index enables geospatial queries on spherical coordinates using GeoJSON data. Create it with `createIndex({ field: "2dsphere" })` and store coordinates as `[longitude, latitude]` in GeoJSON Point format. Use `$near` for proximity searches sorted by distance, `$geoWithin` to find documents inside a polygon, and `$geoIntersects` to find geometries that overlap. The `$geoNear` aggregation stage provides distance calculations alongside query results.
