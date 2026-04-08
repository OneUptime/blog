# Validation Summary: How to Create a Static Mapping for Atlas Search Indexes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Atlas Search static field mappings
- Atlas CLI (`atlas clusters search indexes create`)
- MongoDB `$search` aggregation pipeline stage
- Lucene analyzers (english, keyword, standard)

## Sources Consulted
- MongoDB Atlas Search documentation: Define Field Mappings (https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/)
- MongoDB Atlas Search documentation: Field types (https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/#std-label-bson-data-chart)
- MongoDB Atlas Search documentation: compound operator (https://www.mongodb.com/docs/atlas/atlas-search/compound/)
- MongoDB Atlas CLI documentation: atlas clusters search indexes create (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-search-indexes-create/)
- MongoDB Atlas Search documentation: multi analyzer (https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/#std-label-fts-field-mappings-multi)

## Issues Found
1. **Invalid `document` field type in table**: The Field Types table listed `document` as a valid Atlas Search field type with the description "Sub-document field access." Atlas Search does not have a `document` type; the correct type for nested objects is `embeddedDocuments`, which was already listed in the table. Removed the `document` row.

2. **Query referenced unmapped field `inStock`**: The query example used `index: "product-static-index"` and filtered on the `inStock` field with the `equals` operator. However, the `product-static-index` definition in the CLI section only mapped `title`, `price`, and `category` — it did not include `inStock`. Querying an unmapped field with a static index (where `dynamic: false`) would return no results for that filter. Added `"inStock": { "type": "boolean" }` to the CLI index definition to make the query consistent.

## Review Notes
- The post correctly explains the difference between static and dynamic mappings and provides practical examples.
- The `multi` analyzer example is accurate and follows the correct syntax.
- The Atlas CLI command and flags are current and correct.
- The `$search` aggregation syntax including `compound`, `text`, `equals`, and `range` operators is correct.
