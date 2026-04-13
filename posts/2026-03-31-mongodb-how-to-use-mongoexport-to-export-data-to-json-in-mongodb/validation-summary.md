# Validation Summary: How to Use mongoexport to Export Data to JSON in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongoexport (MongoDB Database Tools)
- JSON / JSON Lines (NDJSON)
- Bash shell scripting

## Sources Consulted
- MongoDB Database Tools documentation for mongoexport: https://www.mongodb.com/docs/database-tools/mongoexport/
- MongoDB Extended JSON (v2) reference: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- MongoDB Database Tools installation guide: https://www.mongodb.com/docs/database-tools/installation/

## Issues Found
1. **Incorrect use of `--noHeaderLine` flag in "Selecting Specific Fields" section.**
   - **What was wrong:** The second example used `--noHeaderLine` with a comment claiming it would "Exclude _id field." The `--noHeaderLine` flag is a CSV-only option that suppresses the column header row in CSV exports. It has no effect on JSON output and does not exclude the `_id` field.
   - **What was changed:** Replaced the misleading comment and removed `--noHeaderLine`. Updated the comment to clarify that `_id` is still included by default when using `--fields`, and changed the output filename to `users-contact-only.json` to better reflect the example's purpose.
   - **Why:** `mongoexport` always includes `_id` in JSON output by default, even when `--fields` is specified without `_id`. There is no built-in flag to exclude `_id` from JSON exports; post-processing (e.g., with `jq`) would be needed to strip it.

## Review Notes
- The post correctly notes that default output is JSON Lines format (one document per line), not a JSON array — a common point of confusion.
- The `--pretty` flag is correctly shown alongside `--jsonArray`, as `--pretty` only takes effect when `--jsonArray` is also specified.
- The shell script automation example uses `wc -l` to count lines after a `--jsonArray` export, which would not give an accurate document count (since `--jsonArray` produces a single JSON structure, not one-document-per-line). This is a minor cosmetic issue in logging output but not technically wrong — the script still functions correctly.
- All CLI flags (`--uri`, `--db`, `--collection`, `--out`, `--query`, `--fields`, `--sort`, `--limit`, `--skip`, `--jsonArray`, `--pretty`, `--tls`, `--tlsCAFile`, `--host`, `--port`, `--username`, `--password`, `--authenticationDatabase`) are valid mongoexport options.
- The Extended JSON v2 date format used in the query example (`{"$date": "2026-03-01T00:00:00Z"}`) is correct.
