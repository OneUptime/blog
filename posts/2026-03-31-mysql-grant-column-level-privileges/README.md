# How to Grant Column-Level Privileges in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Privilege, Security, Column

Description: Learn how to grant MySQL privileges on specific columns within a table, enabling fine-grained access control that hides or restricts sensitive fields.

---

## What Are Column-Level Privileges?

MySQL supports granting SELECT, INSERT, UPDATE, and REFERENCES privileges at the individual column level within a table. This is useful when a user needs access to most columns but must be blocked from sensitive fields such as salary, SSN, or password hashes.

## Syntax for Column-Level GRANT

```sql
GRANT privilege_type (column1, column2, ...)
ON database_name.table_name
TO 'user'@'host';
```

## Granting SELECT on Specific Columns

```sql
-- Allow reading name and department but not salary
GRANT SELECT (id, name, department, hire_date)
ON mydb.employees
TO 'hr_viewer'@'%';
```

The user can query those four columns but receives an error when trying to select `salary` or `ssn`.

## Granting UPDATE on Specific Columns

Allow an application to update only the `status` column, not any others:

```sql
GRANT UPDATE (status)
ON mydb.orders
TO 'order_processor'@'%';
```

## Granting INSERT with Column Restrictions

```sql
GRANT INSERT (name, email, region)
ON mydb.customers
TO 'lead_capture'@'%';
```

The `lead_capture` user can insert rows but only with those three columns populated from application input; the remaining columns must have defaults or be nullable.

## Combining Column-Level and Table-Level Grants

You can mix table-level and column-level grants for the same user:

```sql
-- Full SELECT on orders table
GRANT SELECT ON mydb.orders TO 'reporter'@'%';

-- But only partial SELECT on employees (no salary)
GRANT SELECT (id, name, department) ON mydb.employees TO 'reporter'@'%';
```

## Verifying Column-Level Grants

```sql
SHOW GRANTS FOR 'hr_viewer'@'%';
```

Output:

```text
+-------------------------------------------------------------------------+
| Grants for hr_viewer@%                                                  |
+-------------------------------------------------------------------------+
| GRANT USAGE ON *.* TO `hr_viewer`@`%`                                   |
| GRANT SELECT (id, name, department, hire_date) ON `mydb`.`employees`    |
|   TO `hr_viewer`@`%`                                                    |
+-------------------------------------------------------------------------+
```

## Querying information_schema for Column Privileges

```sql
SELECT GRANTEE, TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, PRIVILEGE_TYPE
FROM information_schema.COLUMN_PRIVILEGES
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'employees'
ORDER BY GRANTEE, COLUMN_NAME;
```

## Testing the Restriction

```sql
-- As hr_viewer user:
SELECT id, name, department FROM mydb.employees;  -- succeeds

SELECT salary FROM mydb.employees;
-- ERROR 1143 (42000): SELECT command denied to user 'hr_viewer'@'%' for column 'salary' in table 'employees'
```

## Revoking Column-Level Privileges

```sql
REVOKE SELECT (salary) ON mydb.employees FROM 'hr_viewer'@'%';
-- If the column was never granted, this raises an error (ERROR 1147)
```

To revoke all column grants:

```sql
REVOKE SELECT (id, name, department, hire_date) ON mydb.employees FROM 'hr_viewer'@'%';
```

## Limitations

- Column-level privileges can be verbose to manage across many tables.
- Views are often a cleaner alternative: create a view that exposes only the permitted columns and grant SELECT on the view instead of the table.

## Summary

MySQL column-level privileges let you allow or restrict access to individual fields within a table using `GRANT SELECT (col1, col2) ON db.table TO user`. They are the most granular built-in access control mechanism in MySQL. For complex scenarios, views that expose only permitted columns are often easier to maintain and audit than per-column GRANTs.
