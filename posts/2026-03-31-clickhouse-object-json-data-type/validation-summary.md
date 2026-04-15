# Validation Summary: How to Use Object JSON Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (versions 22.x-23.x for Object('json'), 24.x-25.x for new JSON type)
- SQL
- Object('json') data type (deprecated/experimental)
- New JSON data type (production-ready in 25.3)

## Sources Consulted
- ClickHouse official JSON data type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/json
- ClickHouse JSON schema integration guide: https://clickhouse.com/docs/en/integrations/data-formats/json/schema (confirms `enable_json_type` setting and missing-value behavior for Tuple-based vs JSON-based sub-columns)
- ClickHouse 2024 changelog: https://clickhouse.com/docs/en/whats-new/changelog/2024 (confirms JSON type moved from experimental to beta in 24.12)
- ClickHouse blog on the new JSON type: https://clickhouse.com/blog/a-new-powerful-json-data-type-for-clickhouse (confirms new JSON type introduced in 24.08 as experimental, replacing deprecated Object('json'))
- ClickHouse settings documentation: https://clickhouse.com/docs/en/operations/settings/settings

## Issues Found

### 1. Incorrect `isNotNull` recommendation for Object('json') sub-columns
**What was wrong:** The "Handling Missing Paths" section recommended using `isNotNull` to detect missing JSON fields. However, Object('json') sub-columns are non-Nullable (they use the Tuple-based internal representation), so missing paths return type defaults (0 for integers, '' for strings), not NULL. The `isNotNull` function would always return true on these columns and cannot distinguish missing from present.
**What was changed:** Updated the text to explain that sub-columns are non-Nullable and `isNotNull` will always return true, recommending only `nullIf` as the correct workaround.

### 2. No-op `isNotNull` filter in aggregation query
**What was wrong:** The aggregation query used `AND isNotNull(payload.status_code)` as a WHERE filter. Since `payload.status_code` is a non-Nullable sub-column of Object('json'), this filter would never exclude any rows.
**What was changed:** Replaced with `AND payload.status_code != 0` which actually filters out rows where the status_code path is missing (stored as default value 0).

### 3. Incorrect production-readiness claim for new JSON type
**What was wrong:** The migration section stated that ClickHouse 24.x introduced the new JSON type "with production-ready guarantees." The JSON type was experimental in 24.08, moved to beta in 24.12, and only became production-ready in version 25.3.
**What was changed:** Updated to state the type was "experimental in 24.x and became production-ready in version 25.3."

### 4. Summary recommended 24.x for new deployments
**What was wrong:** The closing summary said "For new deployments on ClickHouse 24.x or later, prefer the newer JSON type." Since the JSON type was experimental/beta in 24.x, recommending it for new deployments at that version is premature.
**What was changed:** Updated to "25.3 or later" to match the production-readiness milestone.

## Review Notes
- The `Object('json')` type is deprecated and its documentation has been removed from the official ClickHouse docs. The blog post serves as useful historical documentation for teams still running ClickHouse 22.x-23.x deployments.
- The `enable_json_type = 1` setting used in the migration section is confirmed in the official ClickHouse integration docs. In 25.3+ no setting is needed.
- The type conflict behavior described (falling back to String) is approximately correct but may vary by ClickHouse version; in some versions, type conflicts could cause insert errors rather than a silent fallback.
- The `nullIf` approach for detecting missing fields is a workaround, not a complete solution - it cannot distinguish between a genuinely missing field and one that was explicitly set to the default value (e.g., `status_code: 0`). This is an inherent limitation of Object('json')'s non-Nullable sub-columns that the new JSON type addresses by using NULL for missing paths.
