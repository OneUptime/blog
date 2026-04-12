# How to Apply Third Normal Form (3NF) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Normalization, 3NF, Schema Design, Transitive Dependency

Description: Learn what Third Normal Form (3NF) means in MySQL and how to eliminate transitive dependencies by separating non-key to non-key relationships into their own tables.

---

## Prerequisites

A table must be in Second Normal Form (2NF) before applying 3NF.

## What Is Third Normal Form (3NF)?

A table is in 3NF when:

1. It is already in 2NF.
2. No non-key column transitively depends on the primary key through another non-key column.

A **transitive dependency** exists when: column C depends on column B, and column B depends on column A (the primary key). Therefore C indirectly depends on A through B.

## Example of a 3NF Violation

```sql
-- VIOLATES 3NF: city and state depend on zip_code, not the primary key
CREATE TABLE customers (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    zip_code   CHAR(5)      NOT NULL,
    city       VARCHAR(100) NOT NULL,   -- depends on zip_code, not id
    state      CHAR(2)      NOT NULL    -- depends on zip_code, not id
);
```

Here both `city` and `state` depend on `zip_code`, and `zip_code` depends on `id`. This makes `city` and `state` transitively dependent on the primary key through the non-key column `zip_code`. If a zip code is reassigned to a different city, you must update every customer row with that zip code.

## Applying 3NF: Extract the Transitive Dependency

```sql
-- Separate the geography data
CREATE TABLE zip_codes (
    zip   CHAR(5)      PRIMARY KEY,
    city  VARCHAR(100) NOT NULL,
    state CHAR(2)      NOT NULL
);

-- customers now only holds the foreign key
CREATE TABLE customers (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name     VARCHAR(100) NOT NULL,
    email    VARCHAR(255) NOT NULL,
    zip_code CHAR(5)      NOT NULL,
    CONSTRAINT fk_customers_zip FOREIGN KEY (zip_code) REFERENCES zip_codes (zip)
);
```

Now `city` and `state` are stored once in `zip_codes` and all customer rows automatically reflect any update.

## Another Example: Employee Department

```sql
-- VIOLATES 3NF: department_name depends on department_id, not employee id
-- BAD:
-- employees(id, name, department_id, department_name)

-- 3NF compliant:
CREATE TABLE departments (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE employees (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    department_id INT UNSIGNED NOT NULL,
    CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments (id)
);
```

## Querying the 3NF Schema

```sql
SELECT
    c.id,
    c.name,
    c.email,
    z.city,
    z.state
FROM customers c
JOIN zip_codes z ON z.zip = c.zip_code
WHERE z.state = 'CA';
```

## When Not to Normalize to 3NF

3NF can introduce extra joins that slow down read-heavy workloads. For reporting databases or data warehouses, controlled denormalization (storing redundant data) is sometimes acceptable. Apply 3NF in transactional OLTP systems and evaluate denormalization only after profiling shows a real bottleneck.

## Summary

3NF removes transitive dependencies - situations where a non-key column depends on another non-key column rather than directly on the primary key. Extract the dependent group into its own table and replace it with a foreign key. This eliminates update anomalies, reduces storage waste, and makes schema maintenance easier.
