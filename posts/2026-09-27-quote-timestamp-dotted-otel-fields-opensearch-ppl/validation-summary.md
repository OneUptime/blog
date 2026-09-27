# Validation Summary: How to Quote Timestamp and Dotted OpenTelemetry Fields in OpenSearch PPL

## Status
validated

## Post Type
Technical guide with PPL queries and HTTP API examples.

## Technologies Covered
- OpenSearch Piped Processing Language (PPL) and the SQL plugin
- OpenSearch mappings, nested fields, and Field Capabilities API
- OpenTelemetry logs and resource attributes
- JSON request bodies and shell quoting

## Sources Consulted
- [OpenSearch identifiers](https://docs.opensearch.org/latest/sql-and-ppl/identifiers/)
- [PPL overview and plugin requirements](https://docs.opensearch.org/latest/sql-and-ppl/ppl/index/)
- [PPL where](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/where/)
- [PPL fields](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/fields/)
- [PPL head](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/head/)
- [PPL eval](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/eval/)
- [PPL stats](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/stats/)
- [PPL sort](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/sort/)
- [SQL and PPL API](https://docs.opensearch.org/latest/sql-and-ppl/sql-and-ppl-api/index/)
- [Search API and source filtering](https://docs.opensearch.org/latest/api-reference/search-apis/search/)
- [Get Index Mappings API](https://docs.opensearch.org/latest/api-reference/index-apis/get-mapping/)
- [Field Capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/)
- [Nested field type](https://docs.opensearch.org/latest/mappings/supported-field-types/nested/)
- [SQL and PPL data types](https://docs.opensearch.org/latest/sql-and-ppl/datatypes/)
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [RFC 8259, JSON string syntax](https://www.rfc-editor.org/rfc/rfc8259#section-7)

## Issues Found
- Added serviceName to the source-filter list in the schema-inspection request so the alternate field shape discussed immediately afterward can appear in the returned document.

## Review Notes
- Verified complete dotted identifier quoting and exact identifier capitalization. Official PPL examples use the same resource.attributes.service.name field with backticks. Backticks around @timestamp are valid, although the identifier reference also permits an unquoted leading @; the post recommends a valid quoting convention.
- Checked the source, where, fields, head, eval, stats count() as log_count by service, and descending sort syntax against official examples. The isolated eval string assignment is an intentionally incorrect usage example, correctly explained as assigning a constant.
- Confirmed GET search with size and a source-field array, GET mappings, POST field capabilities with a wildcard index and comma-separated fields, and the PPL JSON query request. Parsed both JSON request bodies successfully with Python.
- Confirmed that quoting cannot fix missing fields or mapping conflicts, that ordinary object arrays lose element associations when flattened, and that date and date_nanos map to timestamp types in the documented query type system.
- The OpenTelemetry model does not prescribe a universal OpenSearch index schema. The examples appropriately require checking the actual ingested fields and mappings.
- Verified backtick command substitution and suppression of substitution in a quoted heredoc with harmless local Bash checks. RFC 8259 confirms that backticks do not require JSON escaping.
- All four technical reference links in the post resolved to the intended official documentation. No deprecated API usage was identified in the reviewed examples.
- Review used the current official documentation. No live OpenSearch cluster was supplied, so the PPL queries were checked against documented syntax and behavior rather than executed against an index. Actual execution requires the SQL plugin, suitable permissions, and the example index and compatible fields.
- The primary review verified the corrected source-filter request and required no further edits.
