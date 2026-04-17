# How to Implement Column-Level Security in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, SQL, Database, Access Control, Column-Level Security

Description: Learn how to restrict column access in ClickHouse by granting SELECT privileges on specific columns so users cannot read sensitive fields they are not authorized to see.

---

Column-level security in ClickHouse is implemented through column-level `GRANT` statements. Instead of granting `SELECT` on an entire table, you grant `SELECT` on a specific list of columns. Users without a column grant cannot read that column - not even through `SELECT *`. This makes column-level security a powerful tool for protecting sensitive fields like PII, financial data, or credentials within a shared table.

## Example Table with Sensitive Columns

```sql
CREATE DATABASE hr;

CREATE TABLE hr.employees
(
    employee_id UInt64,
    name        String,
    department  LowCardinality(String),
    title       String,
    salary      Decimal(10, 2),
    ssn         String,
    dob         Date,
    email       String,
    hired_at    DateTime
)
ENGINE = MergeTree()
ORDER BY (department, employee_id);

INSERT INTO hr.employees VALUES
    (1, 'Alice Johnson', 'Engineering', 'Senior Engineer', 120000.00, '123-45-6789', '1985-03-15', 'alice@example.com', now()),
    (2, 'Bob Smith',     'Marketing',   'Marketing Lead',  95000.00,  '987-65-4321', '1990-07-22', 'bob@example.com',   now()),
    (3, 'Carol White',   'Engineering', 'Staff Engineer',  145000.00, '456-78-9012', '1982-11-08', 'carol@example.com', now());
```

## Creating Users with Different Access Levels

```sql
-- Manager: can see all columns including salary
CREATE USER hr_manager
    IDENTIFIED WITH sha256_password BY 'ManagerPass123!'
    DEFAULT DATABASE hr;

-- Regular employee: can see name, department, title but not salary, SSN, or DOB
CREATE USER regular_employee
    IDENTIFIED WITH sha256_password BY 'EmpPass456!'
    DEFAULT DATABASE hr;

-- Payroll system: can see salary but not SSN or DOB
CREATE USER payroll_system
    IDENTIFIED WITH sha256_password BY 'PayrollPass789!'
    DEFAULT DATABASE hr;
```

## Granting Column-Level SELECT

Grant access to specific columns only:

```sql
-- Manager sees everything
GRANT SELECT ON hr.employees TO hr_manager;

-- Regular employee sees non-sensitive columns only
GRANT SELECT(employee_id, name, department, title, email, hired_at)
    ON hr.employees
    TO regular_employee;

-- Payroll sees identity + salary columns, not SSN or DOB
GRANT SELECT(employee_id, name, department, salary, hired_at)
    ON hr.employees
    TO payroll_system;
```

## Testing Column Restrictions

When `regular_employee` runs a query attempting to read `salary`:

```sql
-- This will fail with an insufficient_privileges error
SELECT name, salary FROM hr.employees;
```

ClickHouse returns:

```text
DB::Exception: regular_employee: Not enough privileges. To execute this query, it's necessary to have the grant SELECT(salary) ON hr.employees.
```

A query using only permitted columns succeeds:

```sql
-- This succeeds
SELECT name, department, title FROM hr.employees;
```

Even `SELECT *` is restricted:

```sql
-- SELECT * fails for regular_employee because * expands to columns
-- the user is not granted (salary, ssn, dob)
SELECT * FROM hr.employees;
-- DB::Exception: regular_employee: Not enough privileges. To execute this
-- query, it's necessary to have the grant SELECT(salary) ON hr.employees.
```

To read from the table, users must explicitly list only the columns they have been granted.

## Using Roles for Column-Level Policies

Group column grants into roles for easier management:

```sql
CREATE ROLE employee_reader;
CREATE ROLE payroll_reader;
CREATE ROLE hr_full_access;

-- employee_reader: public info only
GRANT SELECT(employee_id, name, department, title, email, hired_at)
    ON hr.employees
    TO employee_reader;

-- payroll_reader: compensation data
GRANT SELECT(employee_id, name, department, salary)
    ON hr.employees
    TO payroll_reader;

-- hr_full_access: all columns
GRANT SELECT ON hr.employees TO hr_full_access;

-- Assign roles to users
GRANT employee_reader TO regular_employee;
GRANT payroll_reader  TO payroll_system;
GRANT hr_full_access  TO hr_manager;
```

## Granting INSERT on Specific Columns

Column restrictions also apply to `INSERT`:

```sql
-- Only allow inserting non-sensitive columns
GRANT INSERT(employee_id, name, department, title, email, hired_at)
    ON hr.employees
    TO regular_employee;
```

## Combining Row-Level and Column-Level Security

Row policies and column grants compose naturally. A user subject to both will see only the rows matching the row policy AND only the columns they have been granted:

```sql
-- Row policy: only see own department
CREATE ROW POLICY own_dept_policy
    ON hr.employees
    FOR SELECT
    USING department = (
        SELECT department FROM hr.employees WHERE name = currentUser() LIMIT 1
    )
    TO regular_employee;
```

Now `regular_employee` sees only rows in their own department AND only their permitted columns.

## Checking Column Grants

```sql
-- View all column-level grants
SELECT user_name, role_name, access_type, database, table, column
FROM system.grants
WHERE column IS NOT NULL
ORDER BY user_name, role_name, table, column;

-- View grants for a specific user
SHOW GRANTS FOR regular_employee;
```

## Revoking Column Access

```sql
-- Revoke access to a specific column
REVOKE SELECT(email) ON hr.employees FROM regular_employee;

-- Revoke all column grants on a table
REVOKE SELECT ON hr.employees FROM regular_employee;
```

## Masking Sensitive Data with Views

An alternative approach to column-level security is creating a restricted view that masks or omits sensitive columns:

```sql
CREATE VIEW hr.employees_public AS
SELECT
    employee_id,
    name,
    department,
    title,
    email,
    hired_at
FROM hr.employees;

-- Grant access to the view, not the base table
GRANT SELECT ON hr.employees_public TO regular_employee;
-- Revoke direct table access
REVOKE SELECT ON hr.employees FROM regular_employee;
```

This approach allows masking column values (for example, showing only the last 4 digits of SSN) rather than hiding them entirely:

```sql
CREATE VIEW hr.employees_masked AS
SELECT
    employee_id,
    name,
    department,
    title,
    salary,
    concat('***-**-', substring(ssn, 8, 4)) AS ssn,
    hired_at
FROM hr.employees;
```

## Summary

Column-level security in ClickHouse is controlled through column-specific `GRANT SELECT(col1, col2)` statements. Users without a column grant cannot read that column in any query, including `SELECT *`. Use roles to manage column grants across user groups, combine with row policies for full data access control, and consider masked views when you need to show partial data rather than blocking access entirely.
