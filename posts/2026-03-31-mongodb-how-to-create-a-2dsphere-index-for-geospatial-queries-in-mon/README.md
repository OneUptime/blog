# How to Create a 2dsphere Index for Geospatial Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, 2dsphere Index, Location Queries, GeoJSON

Description: Create 2dsphere indexes in MongoDB to enable geospatial queries on GeoJSON data including point-within-polygon, proximity, and intersection operations.

---

## What Is a 2dsphere Index?

A `2dsphere` index supports queries on GeoJSON geometry objects stored in MongoDB. It handles spherical geometry (Earth's curved surface) using coordinates in longitude/latitude. Use it for:
- Finding nearby locations (restaurants, users, drivers)
- Points within an area (delivery zones, geofencing)
- Geometry intersection queries

The older `2d` index uses flat (planar) geometry and is appropriate only for small-area maps where Earth's curvature is negligible.

## GeoJSON Format

MongoDB uses GeoJSON for storing geometric data:

```javascript
// Point - a single location
{ type: "Point", coordinates: [longitude, latitude] }

// Polygon - an area
{
  type: "Polygon",
  coordinates: [[
    [lng1, lat1],
    [lng2, lat2],
    [lng3, lat3],
    [lng1, lat1]  // Must close the ring
  ]]
}

// MultiPoint, LineString, MultiPolygon also supported
```

**Important**: GeoJSON uses `[longitude, latitude]` order, not `[latitude, longitude]`.

## Step 1: Store Location Data as GeoJSON

```javascript
// Insert restaurant documents with GeoJSON locations
db.restaurants.insertMany([
  {
    name: "Pizza Palace",
    cuisine: "Italian",
    location: {
      type: "Point",
      coordinates: [-73.9857, 40.7484]   // [longitude, latitude]
    },
    rating: 4.5
  },
  {
    name: "Sushi Garden",
    cuisine: "Japanese",
    location: {
      type: "Point",
      coordinates: [-73.9851, 40.7589]
    },
    rating: 4.8
  },
  {
    name: "Taco Town",
    cuisine: "Mexican",
    location: {
      type: "Point",
      coordinates: [-74.0060, 40.7128]
    },
    rating: 4.2
  }
])
```

## Step 2: Create a 2dsphere Index

```javascript
db.restaurants.createIndex({ location: "2dsphere" })
```

Verify it was created:

```javascript
db.restaurants.getIndexes()
// [
//   { name: "_id_", ... },
//   { name: "location_2dsphere", key: { location: "2dsphere" } }
// ]
```

## Step 3: Compound 2dsphere Index

Combine with other fields for filtered geospatial queries:

```javascript
// Index on location + cuisine for queries like "nearby Italian restaurants"
db.restaurants.createIndex({ location: "2dsphere", cuisine: 1, rating: -1 })
```

## Step 4: Find Nearby Locations with $near

```javascript
// Find restaurants within 1km of a point, sorted by distance
db.restaurants.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9857, 40.7484]  // Search point (lng, lat)
      },
      $maxDistance: 1000,   // Maximum distance in meters
      $minDistance: 0
    }
  }
})
```

Results are automatically sorted by distance (nearest first).

## Step 5: Find Points Inside a Polygon with $geoWithin

```javascript
// Find all restaurants inside Manhattan (simplified polygon)
db.restaurants.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.0479, 40.6829],
          [-73.9067, 40.6829],
          [-73.9067, 40.8820],
          [-74.0479, 40.8820],
          [-74.0479, 40.6829]
        ]]
      }
    }
  }
})
```

## Step 6: Find Points Within a Circle with $geoWithin $centerSphere

```javascript
// Find restaurants within 5km using spherical geometry
// $centerSphere uses [coordinates, radius in radians]
// Radius in radians = distance in km / 6371 (Earth's radius in km)
db.restaurants.find({
  location: {
    $geoWithin: {
      $centerSphere: [[-73.9857, 40.7484], 5 / 6371]  // 5km radius
    }
  }
})
```

## Step 7: Count Locations in Aggregation

```javascript
// Count restaurants per cuisine type within 2km
db.restaurants.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.9857, 40.7484] },
      distanceField: "distance",
      maxDistance: 2000,
      spherical: true
    }
  },
  {
    $group: {
      _id: "$cuisine",
      count: { $sum: 1 },
      avgRating: { $avg: "$rating" }
    }
  },
  { $sort: { count: -1 } }
])
```

## Step 8: Index Rules and Limitations

```javascript
// A compound index can include multiple 2dsphere fields (since MongoDB 2.6+)
// This is valid:
db.places.createIndex({ location: "2dsphere", category: 1 })

// This is also valid (two 2dsphere fields):
db.places.createIndex({ location: "2dsphere", area: "2dsphere" })

// 2dsphere indexes are not sparse by default (MongoDB 4.4+)
db.places.createIndex({ location: "2dsphere" }, { sparse: true })
// Set sparse: true if some documents don't have the location field
```

## Step 9: Validate GeoJSON Coordinates

Longitude must be in [-180, 180] and latitude in [-90, 90]:

```javascript
function isValidGeoPoint(lng, lat) {
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

// MongoDB will reject invalid coordinates
try {
  db.places.insertOne({
    location: { type: "Point", coordinates: [200, 95] }  // Invalid!
  });
} catch (e) {
  console.error("Invalid GeoJSON:", e.message);
}
```

## Summary

Create a `2dsphere` index with `db.collection.createIndex({ location: "2dsphere" })` to enable geospatial queries on GeoJSON Point, Polygon, and LineString data. Store coordinates in `[longitude, latitude]` order per GeoJSON spec. Use `$near` for proximity searches (returns results sorted by distance), `$geoWithin` to find points inside polygons or circles, and `$geoNear` in aggregation pipelines to compute distances. Add a sparse option if some documents lack the location field.
