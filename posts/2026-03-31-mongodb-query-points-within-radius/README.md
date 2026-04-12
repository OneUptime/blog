# How to Query Points Within a Radius in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, GeoJSON, Query

Description: Learn how to query MongoDB for documents within a given radius using $near, $geoWithin with $centerSphere, and the $geoNear aggregation stage with practical examples.

---

Finding nearby points within a specified distance is one of the most common geospatial operations. MongoDB offers three approaches: `$near` for sorted proximity queries, `$geoWithin` with `$centerSphere` for unordered containment queries, and `$geoNear` in aggregation for distance-enriched results.

## Prerequisites

Ensure you have a `2dsphere` index on the location field:

```javascript
db.places.createIndex({ location: "2dsphere" });
```

Sample data:

```javascript
db.places.insertMany([
  { name: "Coffee Shop", location: { type: "Point", coordinates: [-73.9857, 40.7484] } },
  { name: "Bookstore", location: { type: "Point", coordinates: [-73.9830, 40.7510] } },
  { name: "Park", location: { type: "Point", coordinates: [-73.9780, 40.7560] } },
  { name: "Restaurant", location: { type: "Point", coordinates: [-73.9700, 40.7620] } }
]);
```

## Method 1: $near with $maxDistance

`$near` returns documents sorted from nearest to farthest within a maximum distance in meters:

```javascript
// Find all places within 1 km of Times Square
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9857, 40.7580]  // Times Square
      },
      $maxDistance: 1000  // 1000 meters = 1 km
    }
  }
});
```

Add `$minDistance` to exclude very close results:

```javascript
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9857, 40.7580]
      },
      $minDistance: 100,   // at least 100m away
      $maxDistance: 2000   // at most 2km away
    }
  }
});
```

## Method 2: $geoWithin with $centerSphere

`$geoWithin` with `$centerSphere` finds documents within a circular area. It does not sort by distance but does not require a geospatial index (though one improves performance). Distance is specified in radians.

```javascript
const radiusKm = 2.0;
const earthRadiusKm = 6378.1;
const radiusRadians = radiusKm / earthRadiusKm;

db.places.find({
  location: {
    $geoWithin: {
      $centerSphere: [
        [-73.9857, 40.7580],  // center [longitude, latitude]
        radiusRadians
      ]
    }
  }
});
```

## Method 3: $geoNear Aggregation (Recommended for Distance)

`$geoNear` adds a `distance` field to each result, enabling sorting, filtering, and further aggregation:

```javascript
db.places.aggregate([
  {
    $geoNear: {
      near: {
        type: "Point",
        coordinates: [-73.9857, 40.7580]
      },
      distanceField: "distanceMeters",
      maxDistance: 2000,        // 2 km in meters
      spherical: true
    }
  },
  {
    $project: {
      name: 1,
      distanceMeters: { $round: ["$distanceMeters", 0] },
      distanceKm: {
        $round: [{ $divide: ["$distanceMeters", 1000] }, 2]
      }
    }
  },
  { $sort: { distanceMeters: 1 } }
]);
```

Sample output:

```text
[
  { name: "Park", distanceMeters: 686, distanceKm: 0.69 },
  { name: "Bookstore", distanceMeters: 811, distanceKm: 0.81 },
  { name: "Coffee Shop", distanceMeters: 1067, distanceKm: 1.07 },
  { name: "Restaurant", distanceMeters: 1395, distanceKm: 1.40 }
]
```

## Limiting Results

```javascript
db.places.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7580] },
      distanceField: "distance",
      maxDistance: 5000,
      spherical: true
    }
  },
  { $limit: 5 }  // return only the 5 nearest
]);
```

## Using $geoNear with a Filter

```javascript
db.places.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7580] },
      distanceField: "distance",
      maxDistance: 3000,
      query: { category: "restaurant" },  // pre-filter
      spherical: true
    }
  }
]);
```

## Converting Distance Units

```javascript
// Meters to miles: divide by 1609.34
// Meters to feet: multiply by 3.28084
const distanceMiles = distanceMeters / 1609.34;
```

## Summary

MongoDB provides three operators for radius queries: `$near` for sorted proximity searches (requires a 2dsphere index), `$geoWithin` with `$centerSphere` for unordered containment checks, and `$geoNear` in aggregation pipelines when you need the distance value in query results. Use `$geoNear` for most production use cases since it returns sortable distance values and supports additional filters.
