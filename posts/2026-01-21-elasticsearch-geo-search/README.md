# How to Implement Geo Search in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Geo Search, Location, Geospatial, Maps, Search

Description: A comprehensive guide to implementing geo search in Elasticsearch, covering geo-point queries, geo-shapes, distance calculations, and location-based filtering and sorting.

---

Geo search enables location-based features like "find nearby stores," "search within a region," or "sort by distance." Elasticsearch provides powerful geospatial capabilities with geo_point and geo_shape field types. This guide covers implementing effective geo search functionality.

## Geo Field Types

### Geo Point

For latitude/longitude coordinates:

```bash
curl -X PUT "https://localhost:9200/stores" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": { "type": "text" },
        "location": { "type": "geo_point" },
        "address": { "type": "text" }
      }
    }
  }'
```

### Geo Point Formats

```bash
# Object format
curl -X PUT "https://localhost:9200/stores/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Downtown Store",
    "location": { "lat": 40.7128, "lon": -74.0060 }
  }'

# String format
curl -X PUT "https://localhost:9200/stores/_doc/2" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Midtown Store",
    "location": "40.7549,-73.9840"
  }'

# Array format [lon, lat] - Note: longitude first!
curl -X PUT "https://localhost:9200/stores/_doc/3" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Uptown Store",
    "location": [-73.9654, 40.7829]
  }'

# Geohash format
curl -X PUT "https://localhost:9200/stores/_doc/4" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Brooklyn Store",
    "location": "dr5ru7c"
  }'
```

### Geo Shape

For complex geometries:

```bash
curl -X PUT "https://localhost:9200/regions" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": { "type": "text" },
        "boundary": { "type": "geo_shape" }
      }
    }
  }'
```

## Geo Distance Query

Find documents within a distance from a point:

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "geo_distance": {
        "distance": "5km",
        "location": {
          "lat": 40.7128,
          "lon": -74.0060
        }
      }
    }
  }'
```

### Distance Units

- `mi` or `miles`
- `yd` or `yards`
- `ft` or `feet`
- `km` or `kilometers`
- `m` or `meters`
- `cm` or `centimeters`
- `mm` or `millimeters`
- `nmi` or `nauticalmiles`

### Distance Type

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "geo_distance": {
        "distance": "10km",
        "distance_type": "arc",
        "location": {
          "lat": 40.7128,
          "lon": -74.0060
        }
      }
    }
  }'
```

Options:
- `arc`: More accurate (default)
- `plane`: Faster, less accurate for long distances

## Geo Bounding Box Query

Find documents within a rectangular area:

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "geo_bounding_box": {
        "location": {
          "top_left": {
            "lat": 40.8,
            "lon": -74.1
          },
          "bottom_right": {
            "lat": 40.6,
            "lon": -73.9
          }
        }
      }
    }
  }'
```

### Alternative Formats

```bash
# Using vertices
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "geo_bounding_box": {
        "location": {
          "top": 40.8,
          "left": -74.1,
          "bottom": 40.6,
          "right": -73.9
        }
      }
    }
  }'

# Using WKT
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "geo_bounding_box": {
        "location": {
          "wkt": "BBOX (-74.1, -73.9, 40.8, 40.6)"
        }
      }
    }
  }'
```

## Geo Polygon Query

Find documents within a polygon:

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "geo_polygon": {
        "location": {
          "points": [
            { "lat": 40.7, "lon": -74.0 },
            { "lat": 40.8, "lon": -74.0 },
            { "lat": 40.8, "lon": -73.9 },
            { "lat": 40.7, "lon": -73.9 }
          ]
        }
      }
    }
  }'
```

## Geo Shape Queries

### Indexing Shapes

```bash
# Point
curl -X PUT "https://localhost:9200/regions/_doc/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Central Park",
    "boundary": {
      "type": "point",
      "coordinates": [-73.9654, 40.7829]
    }
  }'

# Polygon
curl -X PUT "https://localhost:9200/regions/_doc/2" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Manhattan",
    "boundary": {
      "type": "polygon",
      "coordinates": [[
        [-74.0479, 40.6829],
        [-73.9067, 40.8007],
        [-73.9271, 40.8790],
        [-74.0198, 40.7519],
        [-74.0479, 40.6829]
      ]]
    }
  }'

# Circle (as envelope)
curl -X PUT "https://localhost:9200/regions/_doc/3" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "name": "Delivery Zone",
    "boundary": {
      "type": "circle",
      "coordinates": [-73.9857, 40.7484],
      "radius": "5km"
    }
  }'
```

### Shape Query

```bash
curl -X GET "https://localhost:9200/regions/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "geo_shape": {
        "boundary": {
          "shape": {
            "type": "point",
            "coordinates": [-73.9857, 40.7484]
          },
          "relation": "intersects"
        }
      }
    }
  }'
```

### Shape Relations

- `intersects`: Any overlap (default)
- `disjoint`: No overlap
- `within`: Shape completely inside indexed shape
- `contains`: Indexed shape completely inside query shape

## Sorting by Distance

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_all": {}
    },
    "sort": [
      {
        "_geo_distance": {
          "location": {
            "lat": 40.7128,
            "lon": -74.0060
          },
          "order": "asc",
          "unit": "km",
          "mode": "min",
          "distance_type": "arc"
        }
      }
    ]
  }'
```

## Distance in Response

Get calculated distance:

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "geo_distance": {
        "distance": "10km",
        "location": { "lat": 40.7128, "lon": -74.0060 }
      }
    },
    "sort": [
      {
        "_geo_distance": {
          "location": { "lat": 40.7128, "lon": -74.0060 },
          "order": "asc",
          "unit": "km"
        }
      }
    ],
    "script_fields": {
      "distance_km": {
        "script": {
          "source": "doc[\"location\"].arcDistance(params.lat, params.lon) / 1000",
          "params": { "lat": 40.7128, "lon": -74.0060 }
        }
      }
    }
  }'
```

## Geo Aggregations

### Geo Distance Aggregation

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "rings_around_point": {
        "geo_distance": {
          "field": "location",
          "origin": { "lat": 40.7128, "lon": -74.0060 },
          "unit": "km",
          "ranges": [
            { "to": 1 },
            { "from": 1, "to": 5 },
            { "from": 5, "to": 10 },
            { "from": 10 }
          ]
        }
      }
    }
  }'
```

### Geohash Grid Aggregation

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "location_grid": {
        "geohash_grid": {
          "field": "location",
          "precision": 5
        }
      }
    }
  }'
```

### Geo Tile Grid (for Map Tiles)

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "map_tiles": {
        "geotile_grid": {
          "field": "location",
          "precision": 8
        }
      }
    }
  }'
```

### Geo Centroid

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "central_location": {
        "geo_centroid": {
          "field": "location"
        }
      }
    }
  }'
```

### Geo Bounds

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "bounding_box": {
        "geo_bounds": {
          "field": "location"
        }
      }
    }
  }'
```

## Complete Store Locator Example

```bash
curl -X GET "https://localhost:9200/stores/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          {
            "geo_distance": {
              "distance": "25km",
              "location": { "lat": 40.7128, "lon": -74.0060 }
            }
          }
        ],
        "filter": [
          { "term": { "is_open": true } },
          { "terms": { "services": ["pickup", "delivery"] } }
        ]
      }
    },
    "sort": [
      {
        "_geo_distance": {
          "location": { "lat": 40.7128, "lon": -74.0060 },
          "order": "asc",
          "unit": "km"
        }
      }
    ],
    "aggs": {
      "distance_ranges": {
        "geo_distance": {
          "field": "location",
          "origin": { "lat": 40.7128, "lon": -74.0060 },
          "unit": "km",
          "ranges": [
            { "key": "within_5km", "to": 5 },
            { "key": "5_to_10km", "from": 5, "to": 10 },
            { "key": "10_to_25km", "from": 10, "to": 25 }
          ]
        }
      },
      "by_service": {
        "terms": { "field": "services" }
      }
    },
    "_source": ["name", "address", "phone", "hours", "services"],
    "script_fields": {
      "distance_km": {
        "script": {
          "source": "Math.round(doc[\"location\"].arcDistance(params.lat, params.lon) / 100) / 10.0",
          "params": { "lat": 40.7128, "lon": -74.0060 }
        }
      }
    },
    "size": 20
  }'
```

## Best Practices

1. **Use geo_point** for simple coordinates
2. **Use geo_shape** for complex boundaries
3. **Index with consistent format** (prefer object format)
4. **Use bounding box** for initial filtering (faster than distance)
5. **Sort by distance** after filtering
6. **Cache geo filters** when possible
7. **Use geohash_grid** for map visualizations

## Conclusion

Geo search in Elasticsearch enables powerful location-based features:

1. **geo_distance** for proximity search
2. **geo_bounding_box** for rectangular areas
3. **geo_shape** for complex geometries
4. **Geo sorting** for nearest results
5. **Geo aggregations** for analytics and visualization

With these capabilities, you can build sophisticated location-aware applications that help users find nearby points of interest, visualize geographic data, and make location-based decisions.
