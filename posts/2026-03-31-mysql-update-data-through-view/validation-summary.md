# Validation Summary: How to Update Data Through a View in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (views, updatable views, DML operations)
- SQL DDL (`CREATE VIEW`, `CREATE OR REPLACE VIEW`)
- SQL DML (`INSERT`, `UPDATE`, `DELETE` through views)
- `WITH CHECK OPTION` (`LOCAL` and `CASCADED`)
- `information_schema.VIEWS`

## Sources Consulted
- MySQL 8.0 Reference Manual — Updatable and Insertable Views: https://dev.mysql.com/doc/refman/8.0/en/view-updatability.html
- MySQL 8.0 Reference Manual — CREATE VIEW Statement: https://dev.mysql.com/doc/refman/8.0/en/create-view.html
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA VIEWS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-views-table.html
- MySQL 8.0 Error Reference — ER_VIEW_CHECK_FAILED (1369): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found
1. **Missing `status` column in original view definition**: The original `CREATE VIEW active_products` SELECT list was `product_id, name, price, stock` — it did not include `status`. Later, the WITH CHECK OPTION section demonstrated `UPDATE active_products SET status = 'inactive'`, which would fail with "Unknown column 'status'" because `status` was not a column exposed by the view. Fixed by adding `status` to the original view's SELECT list.

2. **Inaccurate INSERT explanation text**: The INSERT section stated "Columns not in the view (like `status`)" would receive defaults. After fixing the view to include `status`, this parenthetical became incorrect. Updated the text to accurately say "Base-table columns not listed in the INSERT (like `product_id` and `status`) receive their default values" which is the correct distinction — it's columns missing from the INSERT statement, not columns missing from the view, that get defaults.

## Review Notes
- The list of conditions that make a view non-updatable covers the most important cases but is not exhaustive. MySQL also disallows updates on views that use `ALGORITHM = TEMPTABLE`, reference only literal values, have multiple references to a base table column, or contain subqueries in WHERE that reference FROM tables. This is acceptable for a blog post but readers needing the complete list should consult the official docs.
- The claim that `IS_UPDATABLE = 'YES'` means the view supports INSERT, UPDATE, and DELETE is a slight simplification. A view can be updatable (UPDATE/DELETE) but still fail INSERTs if required NOT NULL columns without defaults are omitted. MySQL does not provide separate flags for each DML type.
- Error code 1369 (ER_VIEW_CHECK_FAILED) and SQLSTATE HY000 are verified correct.
- `WITH CASCADED CHECK OPTION` being the default behavior is verified correct per MySQL docs.
