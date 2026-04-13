# Validation Summary: How to Use Geospatial Queries with Atlas Search in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Atlas Search `geoWithin` operator
- Atlas Search `geoShape` operator
- Atlas Search compound queries
- Atlas Search facets with `$searchMeta`
- Atlas CLI (`atlas clusters search indexes create`)
- GeoJSON

## Sources Consulted
- MongoDB Atlas Search geoWithin documentation: https://www.mongodb.com/docs/atlas/atlas-search/geoWithin/
- MongoDB Atlas Search geoShape documentation: https://www.mongodb.com/docs/atlas/atlas-search/geoShape/
- MongoDB Atlas Search field mappings (geo type): https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/
- Atlas CLI search indexes create command: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-create/

## Issues Found

1. **Incorrect CLI flags (`--db` and `--collection`)**: The `atlas clusters search indexes create` command does not accept `--db` or `--collection` flags. The database and collection names must be specified inside the JSON configuration file passed via `--file`. Removed the invalid flags and added a note clarifying where database/collection are specified.

2. **Incorrect `contains` relation description**: The blog described `contains` as "geometry contains the document's shape," which is backwards and also duplicates the meaning of `within`. The correct definition is that the document's indexed shape contains the query geometry. Fixed to "document's shape contains the geometry."

3. **Incorrect distance sorting claim in comparison table**: The table claimed Atlas Search geo operators sort by distance "With scoreDetails." Atlas Search `geoWithin` and `geoShape` are binary match/no-match operators and do not provide distance-based scoring or sorting. Changed to "No (binary match)."

## Review Notes
- The `geoShape` operator requires `"indexShapes": true` in the geo field's index definition. The blog's index example only shows `"type": "geo"` without this property. The `geoWithin` examples would work with the shown index, but the `geoShape` example on a separate collection (`routes`) would need its own index with `indexShapes` enabled. This is not strictly an error since the `geoShape` example uses a different collection/index (`routes_search`), but readers may not realize the additional index configuration needed.
- The facet example wraps `geoWithin` inside a `compound` operator within `facet.operator`. While valid, the official documentation examples show `geoWithin` directly as the facet operator. The blog's pattern is more realistic for combining text and geo, so it was left as-is.
- The `geoWithin` operator also supports a `geometry` shape type (arbitrary GeoJSON geometry like a Polygon) in addition to `box` and `circle`. The blog only covers `box` and `circle`, which is fine for a tutorial but could be expanded in the future.
