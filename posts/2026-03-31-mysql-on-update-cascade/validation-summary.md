# Validation Summary: How to Use ON UPDATE CASCADE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- Foreign key constraints and referential actions
- information_schema views

## Sources Consulted
- MySQL 8.0 Reference Manual: FOREIGN KEY Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual: information_schema REFERENTIAL_CONSTRAINTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-referential-constraints-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: SHOW TABLE STATUS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-table-status.html

## Issues Found
- **Chained Cascades example was incorrect.** The original example had `departments.region_id` referencing `regions.id` and `employees.department_id` referencing `departments.id`. The post claimed that updating `regions.id` would cascade through `departments` into `employees`, but this is wrong. Updating `regions.id` only cascades to `departments.region_id` — it does not change `departments.id`, so no cascade reaches `employees.department_id`. Fixed by replacing the example with a composite primary key structure where `departments` has a composite PK `(region_id, id)` and `employees` has a composite FK `(region_id, department_id)` referencing it. This creates a true chain: updating `regions.id` cascades to `departments.region_id` (part of the composite PK), which then cascades to `employees.region_id` (part of the composite FK). The explanatory text was also updated to accurately describe how chained cascades work.

## Review Notes
- The post correctly notes that InnoDB is required for foreign key enforcement. All examples implicitly assume InnoDB, which is the default storage engine in MySQL 5.5+.
- The pitfall about circular cascades is accurate: MySQL/InnoDB treats a cascade that revisits a previously updated table as RESTRICT, causing the operation to fail at runtime.
- The advice about avoiding primary key updates on auto-increment columns is sound practical guidance.
- All other SQL syntax, information_schema queries, and ALTER TABLE examples are correct.
