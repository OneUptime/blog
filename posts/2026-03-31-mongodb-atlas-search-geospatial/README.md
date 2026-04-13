# How to Use Geospatial Queries with Atlas Search in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Geospatial, Full-Text Search

Description: Learn how to combine full-text search and geospatial filtering in MongoDB Atlas Search using the geoWithin and geoShape operators within compound search queries.

---

MongoDB Atlas Search extends full-text search with geospatial operators, enabling you to combine text relevance scoring with location-based filtering in a single query. This is powerful for use cases like "coffee shops near me" that need both keyword matching and distance filtering.

## Atlas Search vs Native Geospatial Queries

| Feature | Native Geospatial ($near, $geoWithin) | Atlas Search (geo operators) |
|---|---|---|
| Sorts by distance | Yes ($geoNear) | No (binary match) |
| Combines with full-text search | No | Yes (compound) |
| Requires Atlas | No | Yes |
| Faceting | No | Yes |

Use Atlas Search geospatial operators when you need to combine location filtering with full-text search, faceted navigation, or relevance scoring.

## Setting Up an Atlas Search Index with Geo Support

In Atlas UI or via the API, create a search index that includes a `geo` type field:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": { "type": "string" },
      "category": { "type": "string" },
      "description": { "type": "string" },
      "location": { "type": "geo" }
    }
  }
}
```

Via the Atlas CLI:

```bash
atlas clusters search indexes create \
  --clusterName MyCluster \
  --file search-index.json
```

The database and collection names are specified inside the JSON config file, not as CLI flags.

## Using $search with geoWithin

The `geoWithin` operator in Atlas Search returns documents whose location is within a defined geometry:

```javascript
// Find cafes within a polygon (Manhattan)
db.places.aggregate([
  {
    $search: {
      index: "places_search",
      compound: {
        must: [
          {
            text: {
              query: "cafe coffee",
              path: ["name", "description"],
              fuzzy: { maxEdits: 1 }
            }
          }
        ],
        filter: [
          {
            geoWithin: {
              path: "location",
              box: {
                bottomLeft: { type: "Point", coordinates: [-74.020, 40.700] },
                topRight: { type: "Point", coordinates: [-73.960, 40.780] }
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
      category: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $limit: 10 }
]);
```

## Using geoWithin with a Circle

```javascript
db.places.aggregate([
  {
    $search: {
      index: "places_search",
      compound: {
        must: [
          {
            text: {
              query: "pizza restaurant",
              path: "name"
            }
          }
        ],
        filter: [
          {
            geoWithin: {
              path: "location",
              circle: {
                center: { type: "Point", coordinates: [-73.9857, 40.7484] },
                radius: 2000  // 2 km in meters
              }
            }
          }
        ]
      }
    }
  },
  { $limit: 5 }
]);
```

## Using geoShape for Intersection Queries

The `geoShape` operator tests geometric relationships:

```javascript
db.routes.aggregate([
  {
    $search: {
      index: "routes_search",
      geoShape: {
        path: "path",
        relation: "intersects",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-74.010, 40.740],
            [-73.990, 40.740],
            [-73.990, 40.720],
            [-74.010, 40.720],
            [-74.010, 40.740]
          ]]
        }
      }
    }
  }
]);
```

Supported `relation` values:
```text
"contains"     - document's shape contains the geometry
"disjoint"     - geometry does not overlap the document's shape
"intersects"   - geometry overlaps the document's shape
"within"       - document's shape is within the geometry
```

## Combining Full-Text Search, Geo Filtering, and Facets

```javascript
db.places.aggregate([
  {
    $searchMeta: {
      index: "places_search",
      facet: {
        operator: {
          compound: {
            must: [
              { text: { query: "restaurant", path: "name" } }
            ],
            filter: [
              {
                geoWithin: {
                  path: "location",
                  circle: {
                    center: { type: "Point", coordinates: [-73.9857, 40.7484] },
                    radius: 5000
                  }
                }
              }
            ]
          }
        },
        facets: {
          categoriesFacet: { type: "string", path: "category" }
        }
      }
    }
  }
]);
```

## Summary

Atlas Search geospatial operators (`geoWithin` and `geoShape`) enable location filtering within compound search queries, combining full-text relevance with spatial constraints. Use `geoWithin` for circle and bounding box queries, and `geoShape` for geometric relationship tests like `intersects` or `within`. This approach is ideal when you need both text search relevance and location filtering in a single pass, such as a "find nearby" feature with keyword matching.
