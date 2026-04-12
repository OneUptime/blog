# How to Implement Row-Level Security in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Row-Level Security, View, Access Control

Description: Implement row-level security in MySQL using views, stored procedures, and application-context techniques to restrict which rows users can see or modify.

---

## Why Row-Level Security Matters

MySQL does not have native row-level security (RLS) like PostgreSQL's `ROW SECURITY` policies. However, you can achieve similar isolation using views, stored procedures that reference application context, or a tenant ID column pattern. This is essential in multi-tenant applications where each user or tenant must only see their own data.

## Approach 1 - Security Views

Create a view that filters rows based on a known user mapping. Each application user is mapped to a tenant or owner ID in a control table.

```sql
-- Base table
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_name VARCHAR(100),
  total DECIMAL(10,2)
);

-- Mapping table
CREATE TABLE user_tenant_map (
  db_user VARCHAR(64) PRIMARY KEY,
  tenant_id INT NOT NULL
);

INSERT INTO user_tenant_map VALUES ('tenant1_user', 1), ('tenant2_user', 2);
```

Create a filtered view per tenant:

```sql
CREATE VIEW orders_view AS
SELECT o.*
FROM orders o
JOIN user_tenant_map m ON o.tenant_id = m.tenant_id
WHERE m.db_user = SUBSTRING_INDEX(USER(), '@', 1);
```

Grant access to the view, not the base table:

```sql
GRANT SELECT ON myapp.orders_view TO 'tenant1_user'@'%';
REVOKE ALL ON myapp.orders FROM 'tenant1_user'@'%';
```

Now `tenant1_user` only sees rows where `tenant_id = 1`.

## Approach 2 - Application Context via User Variables

Set a session variable on login via an init command, then reference it in views:

```sql
-- In a stored procedure called at connection start
SET @app_tenant_id = (
  SELECT tenant_id FROM user_tenant_map WHERE db_user = SUBSTRING_INDEX(USER(), '@', 1)
);
```

View that uses the session variable:

```sql
CREATE VIEW secure_orders AS
SELECT * FROM orders WHERE tenant_id = @app_tenant_id;
```

This pattern is lightweight but relies on the application correctly setting the variable.

## Approach 3 - Stored Procedure Interface

Expose data only through stored procedures that enforce tenant isolation:

```sql
DELIMITER $$

CREATE PROCEDURE get_my_orders()
BEGIN
  DECLARE v_tenant INT;

  SELECT tenant_id INTO v_tenant
  FROM user_tenant_map
  WHERE db_user = SUBSTRING_INDEX(USER(), '@', 1);

  SELECT * FROM orders WHERE tenant_id = v_tenant;
END$$

DELIMITER ;
```

Grant execute on the procedure, not select on the table:

```sql
GRANT EXECUTE ON PROCEDURE myapp.get_my_orders TO 'tenant1_user'@'%';
```

## Approach 4 - Updatable Views with Check Option

For write access, create an updatable view with `WITH CHECK OPTION` to prevent tenants from inserting rows for other tenants:

```sql
CREATE VIEW my_orders AS
SELECT * FROM orders
WHERE tenant_id = (
  SELECT tenant_id FROM user_tenant_map WHERE db_user = SUBSTRING_INDEX(USER(), '@', 1)
)
WITH CHECK OPTION;
```

Now `INSERT INTO my_orders ... VALUES (2, ...)` fails if the current user's tenant is 1.

## Testing the Isolation

```sql
-- As tenant1_user
SELECT COUNT(*) FROM orders_view;
-- Returns only rows for tenant 1

-- Attempt to access another tenant's data directly fails
SELECT * FROM orders WHERE tenant_id = 2;
-- ERROR 1142: SELECT command denied
```

## Summary

MySQL row-level security is achieved through a combination of views that filter on `USER()`, session variables for application context, and stored procedures that encapsulate access logic. The key principle is granting application users access only to views or procedures, never to base tables directly. This enforces data isolation without requiring separate databases per tenant.
