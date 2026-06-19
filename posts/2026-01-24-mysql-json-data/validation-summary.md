# Validation Summary: How to Handle JSON Data in MySQL 8

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8
- MySQL JSON data type
- SQL JSON path expressions
- MySQL JSON functions
- Generated columns
- MySQL multi-valued indexes
- CHECK constraints

## Sources Consulted
- MySQL 8.4 Reference Manual: The JSON Data Type - https://dev.mysql.com/doc/refman/8.4/en/json.html
- MySQL 8.4 Reference Manual: Functions That Search JSON Values - https://dev.mysql.com/doc/refman/8.4/en/json-search-functions.html
- MySQL 8.4 Reference Manual: CREATE INDEX Statement / Multi-Valued Indexes - https://dev.mysql.com/doc/refman/8.4/en/create-index.html
- MySQL 8.4 Reference Manual: Data Type Default Values - https://dev.mysql.com/doc/refman/8.4/en/data-type-defaults.html
- MySQL 8.0 Release Notes: Changes in MySQL 8.0.17 - https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-17.html
- MySQL 8.4 Reference Manual: Aggregate Function Descriptions - https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html
- RFC 7396: JSON Merge Patch - https://www.rfc-editor.org/rfc/rfc7396

## Issues Found
- The multi-valued index example used `metadata->>'$.tags'`, which returns unquoted text rather than a JSON array expression suitable for the indexed `MEMBER OF()` predicate. Changed the example to index a numeric JSON array with `CAST(metadata->'$.tag_ids' AS UNSIGNED ARRAY)` and query it with `1 MEMBER OF (metadata->'$.tag_ids')`, matching MySQL's documented multi-valued index pattern.
- The `preferences JSON DEFAULT '{}'` example used a literal default for a JSON column. MySQL requires JSON defaults to be written as expression defaults, even for literal values, so it was changed to `preferences JSON DEFAULT ('{}')`.
- The performance diagram claimed a fixed `Small < 1KB` / `External Storage` threshold. MySQL documentation describes JSON storage as binary JSON with storage roughly comparable to LONGBLOB/LONGTEXT and a `max_allowed_packet` limit, not a simple 1KB inline/external cutoff. Reworded the diagram to avoid the inaccurate threshold.
- The JSON vs normalized table comparison said JSON data integrity is "Application enforced." Since the post itself demonstrates CHECK constraints for JSON shape, this was softened to "Limited constraints."

## Review Notes
The post is technically relevant and generally accurate after the corrections above. JSON_VALID checks on JSON columns are redundant because MySQL validates the JSON data type automatically, but they are syntactically valid and can still be used in examples without making the code incorrect.
