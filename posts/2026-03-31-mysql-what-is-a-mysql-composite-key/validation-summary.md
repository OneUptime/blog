# Validation Summary: What Is a MySQL Composite Key

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (InnoDB storage engine)
- Composite primary keys
- Composite unique keys
- Composite indexes
- Leftmost prefix rule
- information_schema.STATISTICS

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: Multiple-Column Indexes — https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html

## Issues Found
No technical issues found.

All SQL syntax is correct and follows MySQL conventions. The composite primary key, composite unique key, and composite index examples are valid and would execute as described. The leftmost prefix rule explanation is accurate — queries must include leading columns of the index to benefit, and skipping a middle column prevents the index from being used for subsequent columns. The column ordering advice (equality before range columns, most selective or most commonly filtered column first) aligns with MySQL optimization best practices. The information_schema.STATISTICS query uses correct column names (INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE) and proper filtering.

## Review Notes
- MySQL 8.0.13+ introduced Index Skip Scan optimization, which can sometimes allow a composite index to be used even when the leading column is missing from the WHERE clause. The post's statement that `WHERE status = 'paid'` does not use the index `(customer_id, status, created_at)` is correct as a general rule, though Skip Scan may apply in some cases. This is a minor nuance that doesn't warrant a change in a post focused on fundamentals.
- The duplicate entry error message format shown as `Duplicate entry '1-color'` is a simplified version of the full MySQL error (`Duplicate entry '1-color' for key 'product_attributes.uk_product_attr'`), which is appropriate for a blog post.
