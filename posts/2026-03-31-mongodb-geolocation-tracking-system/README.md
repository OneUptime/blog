# How to Build a Geolocation Tracking System with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, Index, Tracking, Aggregation

Description: Learn how to build a geolocation tracking system with MongoDB using 2dsphere indexes, $near queries, and aggregation to store and query location data.

---

MongoDB has first-class support for geospatial data through its GeoJSON types and 2dsphere indexes. This makes it well suited for tracking assets, users, or devices by location and answering proximity queries efficiently.

## Storing Location Data

Store coordinates as GeoJSON `Point` objects. MongoDB requires this structure to use 2dsphere index queries.

```javascript
db.locations.insertMany([
  {
    deviceId: "truck-001",
    location: {
      type: "Point",
      coordinates: [-87.6298, 41.8781]  // [longitude, latitude]
    },
    speed: 55,
    ts: new Date()
  },
  {
    deviceId: "truck-002",
    location: {
      type: "Point",
      coordinates: [-87.6500, 41.8900]
    },
    speed: 40,
    ts: new Date()
  }
]);
```

Note that GeoJSON uses `[longitude, latitude]` order, which is the opposite of the common human convention.

## Creating a 2dsphere Index

A 2dsphere index is required for operators like `$near` and significantly improves performance for `$geoWithin`.

```javascript
db.locations.createIndex({ location: "2dsphere" });
```

Add a compound index with `ts` if you regularly filter by time as well.

```javascript
db.locations.createIndex({ location: "2dsphere", ts: -1 });
```

## Querying Nearby Devices

Use `$near` to find the closest devices to a reference point. The `$maxDistance` is specified in meters.

```javascript
db.locations.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-87.63, 41.88]
      },
      $maxDistance: 5000  // 5 km radius
    }
  }
});
```

## Finding Devices Within a Polygon

Use `$geoWithin` with a `$geometry` polygon to restrict results to a specific area such as a delivery zone or geofence.

```javascript
db.locations.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-87.65, 41.86],
          [-87.60, 41.86],
          [-87.60, 41.90],
          [-87.65, 41.90],
          [-87.65, 41.86]
        ]]
      }
    }
  }
});
```

## Tracking Location History

Append each location ping to a history array or insert separate documents. For high-frequency tracking (multiple pings per second), separate documents scale better. Use a time-based TTL index to automatically expire old records.

```javascript
db.location_history.createIndex(
  { ts: 1 },
  { expireAfterSeconds: 604800 }  // 7 days
);
```

## Computing Distance in Aggregation

Use `$geoNear` as the first stage to compute the distance from a reference point and include it as a field in results.

```javascript
db.locations.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-87.63, 41.88] },
      distanceField: "distanceMeters",
      maxDistance: 10000,
      spherical: true
    }
  },
  { $sort: { distanceMeters: 1 } },
  { $limit: 10 }
]);
```

`$geoNear` must be the first stage in the pipeline. It returns documents sorted by distance by default, with the computed distance available as a regular numeric field for downstream stages.

## Summary

A geolocation tracking system in MongoDB relies on three building blocks: storing coordinates as GeoJSON Point objects, creating a 2dsphere index to enable spatial operators, and using `$near`, `$geoWithin`, or `$geoNear` to answer proximity and containment queries. TTL indexes handle automatic cleanup of historical pings, keeping the collection size manageable as data accumulates over time.
