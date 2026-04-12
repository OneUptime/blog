# Validation Summary: How to Use mongoexport for JSON Data Export

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Database Tools (mongoexport, mongoimport, mongodump)
- MongoDB Extended JSON v2 (Relaxed and Canonical)
- jq (JSON processor)
- Bash shell scripting

## Sources Consulted
- MongoDB mongoexport official documentation: https://www.mongodb.com/docs/database-tools/mongoexport/
- MongoDB mongoexport source code (options.go): https://github.com/mongodb/mongo-tools/blob/master/mongoexport/options.go
- MongoDB Extended JSON (v2) reference: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- MongoDB common/options source code (SSL/TLS flags): https://github.com/mongodb/mongo-tools/blob/master/common/options/options.go
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found

1. **`--noObjectId` flag does not exist** (was on lines 54-59): The post used `--noObjectId` to exclude the `_id` field from export output. This flag does not exist in mongoexport. mongoexport always includes `_id` in JSON output. Replaced with a `jq 'del(._id)'` pipe approach which achieves the same result.

2. **Extended JSON default format was wrong** (was on lines 92-111): The post stated that the default output is Extended JSON v2 and showed canonical-style output (`{"$numberDouble":"99.95"}`) as the default. In reality, the default is Extended JSON v2 **Relaxed** mode, which outputs plain numbers (e.g., `99.95`). Corrected the explanation and example output.

3. **`--forceTableScan` misrepresented as JSON format control** (was on line 108): The post used `--forceTableScan` in an example labeled "Relaxed Extended JSON v2", implying it controls JSON output format. `--forceTableScan` actually controls collection scan strategy (bypasses index traversal), not output format. Replaced with the correct `--jsonFormat=canonical` flag and showed proper canonical output.

4. **jq rounding expression was incorrect** (was on line 132): The expression `round * 100 / 100` does not round to 2 decimal places. In jq, `round` yields an integer, so `round * 100 / 100` just returns the rounded integer. Fixed to `.price * 1.1 * 100 | round | . / 100` which correctly rounds to 2 decimal places.

5. **Time-bounded loop produced invalid ISO 8601 dates** (was on line 155): The expression `$((10#$day+1))` produced non-zero-padded day numbers (e.g., `6` instead of `06`), creating dates like `2026-03-6T00:00:00Z` which are not valid ISO 8601. Fixed with `printf '%02d'` to ensure zero-padding.

6. **Description mentioned "aggregation output"** (line 7): The description referenced "aggregation output" but the post does not cover aggregation pipelines with mongoexport. Removed the inaccurate claim from the description.

## Review Notes
- The `--ssl` flag used in the Atlas example is still functional but MongoDB Database Tools have been migrating SSL sub-options toward `--tls*` equivalents (e.g., `--tlsInsecure` replacing `--sslAllowInvalidCertificates`). The core `--ssl` flag still works, so this was left as-is, but future updates may want to switch to `--tls`.
- When using `mongodb+srv://` URIs (as in the Atlas example), TLS is enabled by default, making the `--ssl` flag redundant. It is not harmful but could be removed for clarity.
- The `--noObjectId` flag was also used in the "Pipe to jq" section (line 130) and was removed there as well.
