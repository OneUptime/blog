# Validation Summary: How to Implement Search Autocomplete in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (B-tree indexes, full-text search, prefix indexes, events)
- SQL (DDL, DML, LIKE, MATCH...AGAINST, ON DUPLICATE KEY UPDATE)
- Python (mysql-connector-python)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE INDEX Statement: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — Full-Text Search Functions: https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual — Boolean Full-Text Searches: https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — CREATE EVENT Statement: https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual — Descending Indexes: https://dev.mysql.com/doc/refman/8.0/en/descending-indexes.html
- mysql-connector-python documentation: https://dev.mysql.com/doc/connector-python/en/

## Issues Found
- **Missing UNIQUE constraint for ON DUPLICATE KEY UPDATE**: The `search_suggestions` table used `ON DUPLICATE KEY UPDATE` in its population INSERT...SELECT, but had no UNIQUE constraint other than the auto-increment primary key. This meant the `ON DUPLICATE KEY UPDATE` clause would never trigger — re-running the insert would create duplicate rows instead of updating weights. Fixed by adding `UNIQUE KEY uniq_entity (entity_type, entity_id)` to the table definition, ensuring each entity has a single suggestion entry that gets updated on re-insert.

## Review Notes
- The `VALUES(weight)` syntax in `ON DUPLICATE KEY UPDATE` is deprecated as of MySQL 8.0.20 in favor of the row/column alias syntax (e.g., `INSERT INTO ... AS new ON DUPLICATE KEY UPDATE weight = new.weight`). It still works but may be removed in a future MySQL release.
- The `INDEX idx_weight (weight DESC)` requires MySQL 8.0+ for the descending order to take effect. In MySQL 5.7 and earlier, the `DESC` keyword is parsed but ignored, and the index is created in ascending order. B-tree indexes can still be scanned in reverse, so `ORDER BY weight DESC` queries work regardless, just with slightly less optimization on older versions.
- The `CREATE EVENT` example uses a compound statement (`BEGIN...END`) which requires `DELIMITER` changes when run from the MySQL command-line client. This works fine in application code, GUI tools, or programmatic interfaces.
- The event scheduler must be enabled (`SET GLOBAL event_scheduler = ON`) for the refresh event to execute.
- The Python code does not close the cursor, which is acceptable for a brief example but worth noting for production use.
