# Validation Summary: How to Drop a Primary Key in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (ALTER TABLE, DROP PRIMARY KEY)
- INFORMATION_SCHEMA
- pt-online-schema-change / gh-ost (mentioned as tools for zero-downtime schema changes)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- MySQL 8.0 Reference Manual: CREATE TABLE and AUTO_INCREMENT (https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html)
- MySQL 8.0 Reference Manual: SHOW INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/show-index.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA KEY_COLUMN_USAGE Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html)
- MySQL 8.0 Reference Manual: InnoDB Clustered and Secondary Indexes (https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html)

## Issues Found
1. **Incorrect example in "Drop Primary Key from a Simple Table" section**: The CREATE TABLE statement used `INT AUTO_INCREMENT PRIMARY KEY` for `product_id`, but the example then showed `ALTER TABLE products DROP PRIMARY KEY;` succeeding. This would actually fail with `ERROR 1075 (42000): Incorrect table definition; there can be only one auto column and it must be defined as a key` — the exact error the post explains in the very next section. Fixed by removing `AUTO_INCREMENT` from the CREATE TABLE in the simple example, since the purpose of that section is to demonstrate basic DROP PRIMARY KEY syntax, not the AUTO_INCREMENT edge case.

## Review Notes
- The post correctly explains that AUTO_INCREMENT columns must be indexed and that you need to remove AUTO_INCREMENT before dropping the primary key. The combined ALTER TABLE syntax shown is valid.
- The error messages shown (ERROR 1075 and ERROR 1025 with errno 150) are accurate MySQL error codes and messages.
- The INFORMATION_SCHEMA query and SHOW KEYS approach for checking primary key existence are both correct.
- The performance advice about InnoDB table rebuilds and mentioning pt-online-schema-change and gh-ost is sound and practical.
