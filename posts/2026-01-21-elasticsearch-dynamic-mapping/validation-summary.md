# Validation Summary: How to Use Dynamic Mapping in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch (dynamic mapping, dynamic templates, runtime fields)
- Elasticsearch mapping configuration (`dynamic`, `date_detection`, `numeric_detection`, `dynamic_date_formats`)
- Painless scripting (runtime field `emit()` scripts)
- curl / REST API (index creation, document indexing, search, `_mapping`, `_field_caps`, `_stats`, `_analyze`)

## Sources Consulted
- Elasticsearch Reference — Dynamic field mapping: https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-field-mapping.html
- Elasticsearch Reference — Dynamic templates: https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-templates.html
- Elasticsearch Reference — Dynamic mapping (`dynamic` setting): https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic.html
- Elasticsearch Reference — Runtime fields: https://www.elastic.co/guide/en/elasticsearch/reference/current/runtime.html
- Elasticsearch Reference — Mapping limit settings (`index.mapping.*.limit`): https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-settings-limit.html

## Issues Found
No technical issues found.

The following key claims were verified against official documentation and are accurate:
- **Default type detection table**: floating point → `float`, integer → `long`, `null` → no field added, `true`/`false` → `boolean`, object → `object`, array → depends on first (non-null) element, date string → `date`, string → `text` with `keyword` subfield. All correct for `dynamic: true`.
- **`dynamic` setting values**: `true`, `false`, `strict`, and `runtime` are all valid, and their described behaviors match the docs.
- **Object-level `dynamic`**: overriding `dynamic` per object (`user` → `true`, `metadata` → `false`) under a `strict` root is valid.
- **Dynamic templates**: `match_mapping_type`, `match`, `unmatch`, `path_match` conditions and the complete logs example are syntactically valid.
- **Runtime fields**: the `runtime` mapping block, the `runtime_mappings` search block, and the Painless `emit(...)` scripts (including `dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT)`) are correct.
- **Numeric detection**: with `numeric_detection: true`, `"123"` → `long` and `"1.23"` → `float` is correct.
- **Field-limit defaults**: `index.mapping.total_fields.limit` (1000), `index.mapping.depth.limit` (20), `index.mapping.nested_fields.limit` (50), `index.mapping.nested_objects.limit` (10000) all match documented defaults.
- The example mapping result (text+keyword/256, long, boolean, date) matches what dynamic mapping actually produces.

## Review Notes
- In the "Troubleshooting → Unexpected Field Types" section, the `_analyze` example is presented as a way to "Analyze text to see how it would be mapped." The `_analyze` API actually shows how text is **tokenized/analyzed**, not how a field's type would be detected by dynamic mapping. The command itself is valid and runs correctly, so this is a phrasing nuance rather than a broken example; it was left unchanged to avoid altering content beyond technical corrections. A future edit could clarify that `_analyze` inspects analysis/tokenization, while `_field_caps` or the resulting `_mapping` is what reveals the detected type.
- Under `dynamic: runtime`, dynamically detected floating-point/numeric strings map to `double` (not `float`) and plain strings map to `keyword` (not `text`). The post's detection table describes the `dynamic: true` behavior, which is correct in context; the `runtime`-mode variations are simply not enumerated and are out of scope of that table.
- Commands use `https://localhost:9200` with `-u elastic:password`, consistent with a security-enabled Elasticsearch 8.x+ default setup. Examples are version-agnostic and apply to current 8.x/9.x releases.
