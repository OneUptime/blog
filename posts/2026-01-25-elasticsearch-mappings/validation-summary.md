# Validation Summary: How to Configure Mappings in Elasticsearch

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch mappings and field data types
- Dynamic mappings and dynamic templates
- Runtime fields and Painless scripts
- Elasticsearch Python client
- curl

## Sources Consulted
- Elasticsearch mapping documentation: https://www.elastic.co/docs/manage-data/data-store/mapping
- Elasticsearch Create index API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create
- Elasticsearch date field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/date
- Elasticsearch dynamic field mapping documentation: https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-field-mapping
- Elasticsearch dynamic templates documentation: https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-templates
- Elasticsearch runtime fields documentation: https://www.elastic.co/docs/manage-data/data-store/mapping/map-runtime-field
- Elasticsearch Painless runtime fields documentation: https://www.elastic.co/docs/reference/scripting-languages/painless/use-painless-scripts-in-runtime-fields
- Elasticsearch field data types documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/field-data-types
- Elasticsearch text field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text
- Elasticsearch keyword field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elasticsearch nested field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/nested
- Elasticsearch arrays documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/array
- Elasticsearch normalizer documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/normalizer
- Elasticsearch Python client indices API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/indices.html

## Issues Found
- The supported date values example used an inline `# epoch milliseconds` comment after a JSON object. JSON does not allow comments, so I moved that explanation into prose below the snippet.
- The dynamic templates example placed the generic `strings_as_keywords` template before more specific string templates. Elasticsearch processes dynamic templates in order and the first matching template wins, so `*_message`, `*_at`, and `*_ip` string fields would have been mapped as `keyword` before reaching the specific templates. I reordered the templates and added `match_mapping_type: "string"` to the specific string templates.
- The runtime fields example included a `full_name` script using `first_name` and `last_name`, but those fields were not mapped in the earlier `products` example. I removed that runtime field so the example only references fields present in the demonstrated mapping.
- The Python helper used `body` for `indices.create()` and `indices.put_mapping()`. The current Python client exposes explicit `mappings`, `settings`, `properties`, and `runtime` parameters, so I updated the helper to use those parameters.

## Review Notes
The examples assume a local Elasticsearch node is reachable at `localhost:9200` and that security/authentication settings permit unauthenticated curl requests. That is common for local development examples, but production or default secured clusters may require HTTPS and credentials.
