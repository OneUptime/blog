# Validation Summary: How to Apply Third Normal Form (3NF) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE TABLE, FOREIGN KEY constraints, JOIN queries)
- Database normalization (Third Normal Form / 3NF)
- Schema design patterns (transitive dependency elimination)

## Sources Consulted
- Codd's original definition of Third Normal Form: a relation R is in 3NF if for every functional dependency X → A, either X is a superkey or A is a prime attribute
- MySQL 8.0 Reference Manual — CREATE TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — FOREIGN KEY constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- Database normalization theory (functional dependencies and transitive dependencies)

## Issues Found
1. **Incorrect dependency chain description**: The post described the dependency as `zip_code -> city -> state`, implying that `state` functionally depends on `city`. This is incorrect — many city names exist in multiple US states (e.g., Springfield, Portland, Columbus), so `city → state` is not a valid functional dependency. The actual dependencies are `zip_code → city` and `zip_code → state`; both city and state are transitively dependent on the primary key through `zip_code`. Fixed the SQL comment, inline comment, and prose explanation to accurately describe the dependency structure.

## Review Notes
- All SQL syntax is valid MySQL and uses current, non-deprecated features.
- The normalization examples (zip_codes, departments/employees) are textbook-correct and well-chosen.
- The JOIN query correctly demonstrates how to reconstruct the denormalized view from the 3NF schema.
- The advice about OLTP vs. OLAP/data warehouse denormalization is sound and appropriately nuanced.
- In reality, US zip codes can span multiple cities and even states in rare cases, but the simplification is acceptable for a normalization tutorial.
