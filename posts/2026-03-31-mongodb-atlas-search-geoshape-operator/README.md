# How to Use the geoShape Operator in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, GeoShape, Geospatial, Atlas

Description: Learn how to use the Atlas Search geoShape operator to match documents by geometric spatial relationships like within, intersects, and disjoint.

---

The `geoShape` operator in MongoDB Atlas Search performs geometry-based matching using spatial relationships. Unlike `geoWithin` which only checks if a point is inside a shape, `geoShape` supports multiple relationship types between stored geometries and the query geometry - enabling more advanced spatial queries.

## Supported Relations

| Relation | Description |
|---|---|
| `contains` | Stored geometry entirely contains the query geometry |
| `within` | Stored geometry is entirely inside the query geometry |
| `intersects` | Stored geometry overlaps with the query geometry |
| `disjoint` | Stored geometry has no overlap with the query geometry |

## Index Configuration

Fields must be indexed as `geo` type:

```json
{
  "mappings": {
    "fields": {
      "area": {
        "type": "geo",
        "indexShapes": true
      },
      "boundary": {
        "type": "geo",
        "indexShapes": true
      }
    }
  }
}
```

Documents can store any GeoJSON geometry type, not just points:

```json
{
  "name": "Central Park",
  "area": {
    "type": "Polygon",
    "coordinates": [[
      [-73.9812, 40.7681],
      [-73.9733, 40.7681],
      [-73.9733, 40.7644],
      [-73.9812, 40.7644],
      [-73.9812, 40.7681]
    ]]
  }
}
```

## within: Find Geometries Inside a Query Shape

Find all delivery zones entirely within a city boundary:

```javascript
db.deliveryZones.aggregate([
  {
    $search: {
      geoShape: {
        path: "area",
        relation: "within",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-74.05, 40.68],
            [-73.90, 40.68],
            [-73.90, 40.82],
            [-74.05, 40.82],
            [-74.05, 40.68]
          ]]
        }
      }
    }
  },
  {
    $project: {
      name: 1,
      area: 1
    }
  }
])
```

## intersects: Find Overlapping Geometries

Find all service areas that overlap with a specific region (even partially):

```javascript
db.serviceAreas.aggregate([
  {
    $search: {
      geoShape: {
        path: "boundary",
        relation: "intersects",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-73.98, 40.74],
            [-73.96, 40.74],
            [-73.96, 40.76],
            [-73.98, 40.76],
            [-73.98, 40.74]
          ]]
        }
      }
    }
  },
  {
    $project: {
      name: 1
    }
  }
])
```

## disjoint: Find Non-Overlapping Geometries

Find neighborhoods that do NOT overlap with a flood zone:

```javascript
db.neighborhoods.aggregate([
  {
    $search: {
      geoShape: {
        path: "boundary",
        relation: "disjoint",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-73.99, 40.72],
            [-73.96, 40.72],
            [-73.96, 40.74],
            [-73.99, 40.74],
            [-73.99, 40.72]
          ]]
        }
      }
    }
  }
])
```

## Combining geoShape with Text Search

Find parks that intersect a search boundary and match a keyword:

```javascript
db.parks.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "dog friendly",
              path: ["name", "amenities"]
            }
          }
        ],
        filter: [
          {
            geoShape: {
              path: "area",
              relation: "intersects",
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [-73.99, 40.72],
                  [-73.96, 40.72],
                  [-73.96, 40.76],
                  [-73.99, 40.76],
                  [-73.99, 40.72]
                ]]
              }
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      name: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

## geoShape vs geoWithin

```text
Operator   | Input geometry types   | Relations supported
-----------|------------------------|----------------------------------------------
geoWithin  | Point documents only   | within (box, circle, or polygon)
geoShape   | Any GeoJSON geometry   | contains, within, intersects, disjoint
```

## Summary

The `geoShape` operator enables advanced spatial relationship matching in Atlas Search, supporting `contains`, `within`, `intersects`, and `disjoint` relations between stored GeoJSON geometries and a query shape. It is best suited for applications with polygon-based geographic data, such as service areas, delivery zones, or land parcel management.

