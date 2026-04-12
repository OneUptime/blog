# How to Store GeoJSON Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GeoJSON, Geospatial, Database

Description: Learn how to store GeoJSON geometry types in MongoDB documents, including Point, LineString, Polygon, MultiPoint, and GeometryCollection with practical examples.

---

MongoDB natively supports GeoJSON, a standard format for encoding geographic data structures. By storing location data as GeoJSON, you gain access to MongoDB's powerful geospatial query operators like `$near`, `$geoWithin`, and `$geoIntersects`. This guide covers how to structure and store the most common GeoJSON types.

## GeoJSON Format

GeoJSON uses a specific structure: a `type` field identifying the geometry type and a `coordinates` field containing the position data. In GeoJSON, coordinates are always `[longitude, latitude]` - note the order (longitude first, not latitude).

## Storing a Point

A point represents a single location:

```javascript
db.locations.insertOne({
  name: "Eiffel Tower",
  category: "landmark",
  location: {
    type: "Point",
    coordinates: [2.2945, 48.8584]  // [longitude, latitude]
  }
});
```

## Storing a LineString

A LineString represents a path or route:

```javascript
db.routes.insertOne({
  name: "Morning Run Route",
  distance_km: 5.2,
  path: {
    type: "LineString",
    coordinates: [
      [-73.9857, 40.7484],  // start
      [-73.9820, 40.7530],
      [-73.9780, 40.7580],
      [-73.9750, 40.7620]   // end
    ]
  }
});
```

## Storing a Polygon

A Polygon represents an enclosed area. The first and last coordinate must be identical to close the ring:

```javascript
db.zones.insertOne({
  name: "Central Park",
  type: "park",
  boundary: {
    type: "Polygon",
    coordinates: [
      [
        [-73.9812, 40.7681],  // top-left
        [-73.9580, 40.8005],  // top-right
        [-73.9494, 40.7963],  // bottom-right
        [-73.9732, 40.7648],  // bottom-left
        [-73.9812, 40.7681]   // close the ring (same as first point)
      ]
    ]
  }
});
```

## Storing a MultiPoint

Multiple discrete locations in one document:

```javascript
db.delivery_stops.insertOne({
  routeId: "route_101",
  stops: {
    type: "MultiPoint",
    coordinates: [
      [-73.9857, 40.7484],
      [-73.9780, 40.7580],
      [-73.9700, 40.7650]
    ]
  }
});
```

## Storing a Polygon with a Hole

Polygons can have interior rings (holes) by adding additional coordinate arrays:

```javascript
db.zones.insertOne({
  name: "Donut Zone",
  area: {
    type: "Polygon",
    coordinates: [
      // Outer ring
      [
        [-74.01, 40.74],
        [-73.96, 40.74],
        [-73.96, 40.70],
        [-74.01, 40.70],
        [-74.01, 40.74]
      ],
      // Inner ring (hole) - clockwise
      [
        [-73.99, 40.73],
        [-73.99, 40.71],
        [-73.97, 40.71],
        [-73.97, 40.73],
        [-73.99, 40.73]
      ]
    ]
  }
});
```

## Storing a GeometryCollection

Group multiple geometry types in a single document:

```javascript
db.properties.insertOne({
  propertyId: "prop_001",
  name: "Commercial Complex",
  geometry: {
    type: "GeometryCollection",
    geometries: [
      {
        type: "Point",
        coordinates: [-73.9857, 40.7484]  // main entrance
      },
      {
        type: "Polygon",
        coordinates: [[
          [-73.9870, 40.7490],
          [-73.9840, 40.7490],
          [-73.9840, 40.7475],
          [-73.9870, 40.7475],
          [-73.9870, 40.7490]
        ]]
      }
    ]
  }
});
```

## Creating a 2dsphere Index

To run geospatial queries on GeoJSON data, create a `2dsphere` index:

```javascript
db.locations.createIndex({ location: "2dsphere" });
db.zones.createIndex({ boundary: "2dsphere" });
```

Without a `2dsphere` index, most geospatial operators will not work or will be very slow.

## Validating GeoJSON Structure

Before inserting, validate that coordinates are `[longitude, latitude]` within valid ranges:

```text
Longitude: -180 to 180
Latitude: -90 to 90
```

```javascript
function isValidPoint(lon, lat) {
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}
```

## Summary

MongoDB stores GeoJSON using the standard `type`/`coordinates` structure. Support all GeoJSON types: Point, LineString, Polygon (with optional holes), MultiPoint, MultiLineString, MultiPolygon, and GeometryCollection. Always use `[longitude, latitude]` coordinate order and create a `2dsphere` index on your GeoJSON fields to enable geospatial queries.
