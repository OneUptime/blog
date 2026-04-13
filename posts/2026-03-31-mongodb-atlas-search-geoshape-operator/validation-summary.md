# Validation Summary: How to Use the geoShape Operator in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Atlas Search `geoShape` operator
- Atlas Search `geoWithin` operator (comparison)
- GeoJSON geometry types
- Atlas Search `compound` operator (combined queries)

## Sources Consulted
- MongoDB Atlas Search geoShape operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/geoShape/
- MongoDB Atlas Search geoWithin operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/geoWithin/
- MongoDB Atlas Search geo field type documentation: https://www.mongodb.com/docs/atlas/atlas-search/field-types/geo-type/

## Issues Found

1. **Missing `contains` relation**: The Supported Relations table and comparison table only listed three relations (`within`, `intersects`, `disjoint`). The official docs specify four relations: `contains`, `disjoint`, `intersects`, and `within`. Added `contains` to the table and summary.

2. **Missing `indexShapes: true` in index configuration**: The index definition examples omitted the `indexShapes: true` setting, which is required for the `geoShape` operator to work with non-point geometries. Added `"indexShapes": true` to both field definitions.

3. **Incomplete geoWithin description in comparison table**: The comparison table listed geoWithin as supporting "within (circle or polygon)" but omitted the `box` (bounding box) option. Updated to "within (box, circle, or polygon)".

4. **Missing `contains` in comparison table**: The geoShape row in the comparison table only listed three relations. Updated to include all four: `contains, within, intersects, disjoint`.

5. **Summary paragraph missing `contains`**: The closing summary only mentioned three relations. Updated to include `contains`.

## Review Notes
- The `within` relation cannot be used with `LineString` or `Point` geometries per the official docs. The blog does not mention this restriction, but since none of the examples use these geometry types with `within`, this is not an error — just something readers should be aware of.
- The GeoJSON coordinates used in examples represent plausible New York City locations, which is appropriate for the use cases described.
- The `compound` query example correctly uses `filter` for the geo clause (no scoring impact) and `must` for the text clause, which is a good practice.
