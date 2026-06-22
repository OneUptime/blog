# Validation Summary: How to Design Elasticsearch Index Mappings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch index mappings
- Elasticsearch field data types
- Elasticsearch mapping parameters
- Elasticsearch text analysis and custom analyzers
- Elasticsearch mapping APIs
- curl commands for Elasticsearch REST APIs

## Sources Consulted
- Elasticsearch mapping and field data types documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference
- Elasticsearch text field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text
- Elasticsearch keyword field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elasticsearch numeric field types documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/number
- Elasticsearch date field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/date
- Elasticsearch boolean field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/boolean
- Elasticsearch object field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/object
- Elasticsearch nested field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch geo_point field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/geo-point
- Elasticsearch IP field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ip
- Elasticsearch doc_values mapping parameter documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/doc-values
- Elasticsearch index mapping parameter documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-index
- Elasticsearch store mapping parameter documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-store
- Elasticsearch null_value mapping parameter documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/null-value
- Elasticsearch copy_to mapping parameter documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/copy-to
- Elasticsearch enabled mapping parameter documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/enabled
- Elasticsearch update mapping examples: https://www.elastic.co/docs/manage-data/data-store/mapping/update-mappings-examples
- Elasticsearch custom analyzer documentation: https://www.elastic.co/docs/manage-data/data-store/text-analysis/create-custom-analyzer

## Issues Found
- The `geo_point` array example used `[41.12, -71.34]`, but Elasticsearch arrays for `geo_point` use `[lon, lat]` order. Changed it to `[-71.34, 41.12]`.
- The `doc_values` example showed `doc_values: false` on a `text` field. Elasticsearch does not support doc values on `text` fields, so the example was changed to use a `keyword` field.
- The boolean accepted values list omitted the empty string, which Elasticsearch accepts and interprets as false. Added `""` to the list.
- The numeric type range list omitted `unsigned_long`, a supported Elasticsearch numeric type. Added its documented range.

## Review Notes
The examples are broadly compatible with current Elasticsearch APIs. Several snippets reference custom analyzers or normalizers by name; those snippets are valid when the corresponding analysis settings are defined in the same index settings.
