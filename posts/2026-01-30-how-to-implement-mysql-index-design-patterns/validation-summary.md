# Validation Summary: How to Implement MySQL Index Design Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MySQL
- InnoDB indexes
- B-tree indexes
- Composite indexes
- Covering indexes
- Prefix indexes
- EXPLAIN
- MySQL sys schema

## Sources Consulted
- MySQL 8.4 Reference Manual: The Physical Structure of an InnoDB Index - https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html
- MySQL Reference Manual: How MySQL Uses Indexes - https://dev.mysql.com/doc/refman/9.7/en/mysql-indexes.html
- MySQL Reference Manual: Multiple-Column Indexes - https://dev.mysql.com/doc/en/multiple-column-indexes.html
- MySQL Reference Manual: Range Optimization - https://dev.mysql.com/doc/en/range-optimization.html
- MySQL Reference Manual: CREATE INDEX Statement - https://dev.mysql.com/doc/en/create-index.html
- MySQL Reference Manual: EXPLAIN Output Format - https://dev.mysql.com/doc/refman/5.7/en/explain-output.html
- MySQL Reference Manual: Index Hints - https://dev.mysql.com/doc/en/index-hints.html
- MySQL 8.4 Reference Manual: The schema_unused_indexes View - https://dev.mysql.com/doc/refman/8.4/en/sys-schema-unused-indexes.html
- MySQL 8.4 Reference Manual: The schema_index_statistics and x$schema_index_statistics Views - https://dev.mysql.com/doc/refman/8.4/en/sys-schema-index-statistics.html

## Issues Found
- The composite index example said a query with `customer_id = ...`, `order_date >= ...`, and `status = ...` used the full `(customer_id, order_date, status)` index. MySQL range optimization uses additional key parts for interval construction only until it reaches a range operator such as `>=`, so `status` does not further narrow that index range. Updated the comment to say `customer_id` and `order_date` are used for range access and `status` can still be checked from the index.
- The composite index guidance recommended putting the most selective columns first before range columns. This is incomplete for MySQL composite indexes because equality predicates should generally precede range predicates for this pattern, and leftmost-prefix reuse also matters. Updated the guidance to prioritize equality columns, then range columns.
- The EXPLAIN guidance listed only `ref`, `range`, and `const` as desirable access types. MySQL also has other efficient access types such as `system` and `eq_ref`. Updated the wording to include those and to frame `ALL` as a concern when it is unexpected.
- The index-hints section used valid `USE INDEX`, `FORCE INDEX`, and `IGNORE INDEX` syntax but did not mention MySQL's newer index-level optimizer hints, which the official documentation says are intended to supersede traditional index hints. Added a short caveat while keeping the existing examples.

## Review Notes
The SQL examples are syntactically valid assuming the referenced tables and columns exist. The `sys.schema_unused_indexes` view should be interpreted only after the server has processed a representative workload, as noted in the MySQL documentation.
