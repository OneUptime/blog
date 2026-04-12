# How to Store and Query LineString and Polygon Types in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GeoJSON, Geospatial, Query

Description: Learn how to store and query GeoJSON LineString and Polygon types in MongoDB, covering intersection, containment, and distance queries with practical examples.

---

While Points represent a single location, LineStrings and Polygons model routes, boundaries, corridors, and regions. MongoDB's geospatial operators support all GeoJSON geometry types, making it possible to query relationships between lines, polygons, and points in a single database.

## Storing a LineString

A LineString is an ordered sequence of positions defining a path:

```javascript
db.routes.insertMany([
  {
    routeId: "highway_101",
    name: "Highway 101 Segment",
    path: {
      type: "LineString",
      coordinates: [
        [-122.4194, 37.7749],  // San Francisco
        [-122.2712, 37.8716],  // Berkeley
        [-122.0322, 37.9735],  // Walnut Creek
        [-121.9018, 37.9161]   // Concord
      ]
    },
    lengthKm: 52.4
  }
]);

db.routes.createIndex({ path: "2dsphere" });
```

## Storing a Polygon

```javascript
db.districts.insertMany([
  {
    name: "Financial District",
    city: "San Francisco",
    boundary: {
      type: "Polygon",
      coordinates: [[
        [-122.4070, 37.7870],
        [-122.3970, 37.7870],
        [-122.3970, 37.7940],
        [-122.4070, 37.7940],
        [-122.4070, 37.7870]   // close the ring
      ]]
    }
  }
]);

db.districts.createIndex({ boundary: "2dsphere" });
```

## Querying Points Within a Polygon

Find all restaurants inside a district boundary:

```javascript
const district = db.districts.findOne({ name: "Financial District" });

db.restaurants.find({
  location: {
    $geoWithin: {
      $geometry: district.boundary
    }
  }
});
```

## Querying Polygons That Contain a Point

Find which districts contain a given point:

```javascript
db.districts.find({
  boundary: {
    $geoIntersects: {
      $geometry: {
        type: "Point",
        coordinates: [-122.4000, 37.7910]
      }
    }
  }
});
```

## Querying Intersecting LineStrings

Find all routes that pass through a given area (Polygon):

```javascript
const searchArea = {
  type: "Polygon",
  coordinates: [[
    [-122.4100, 37.7840],
    [-122.3950, 37.7840],
    [-122.3950, 37.7960],
    [-122.4100, 37.7960],
    [-122.4100, 37.7840]
  ]]
};

db.routes.find({
  path: {
    $geoIntersects: {
      $geometry: searchArea
    }
  }
});
```

## Finding Routes Near a Location

Use `$near` on a LineString collection:

```javascript
db.routes.find({
  path: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749]
      },
      $maxDistance: 5000  // 5 km
    }
  }
});
```

## Aggregation with Polygon and Distance

Find points of interest near a route corridor:

```javascript
db.pois.aggregate([
  {
    $geoNear: {
      near: {
        type: "Point",
        coordinates: [-122.3500, 37.9000]
      },
      distanceField: "distance",
      maxDistance: 10000,
      spherical: true,
      query: { category: "gas_station" }
    }
  },
  {
    $project: {
      name: 1,
      distance: { $round: ["$distance", 0] }
    }
  }
]);
```

## Validating Polygon Closure

A GeoJSON polygon ring must start and end at the same point:

```javascript
function isClosedRing(coordinates) {
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function closeRingIfNeeded(coordinates) {
  if (!isClosedRing(coordinates)) {
    return [...coordinates, coordinates[0]];
  }
  return coordinates;
}
```

## Key Rules for LineStrings and Polygons

```text
LineString:
- Minimum 2 coordinate pairs
- No minimum distance requirement

Polygon:
- Outer ring must have at least 4 positions
- First and last positions must be identical (closed ring)
- Outer ring uses counterclockwise winding
- Inner rings (holes) use clockwise winding
- No self-intersecting edges
```

## Summary

MongoDB stores LineString and Polygon GeoJSON types natively and supports spatial relationships between them using `$geoWithin` (containment), `$geoIntersects` (intersection), and `$near` (proximity). Always close polygon rings by repeating the first coordinate at the end. Create a `2dsphere` index on any field containing GeoJSON to enable efficient spatial queries across all geometry types.
