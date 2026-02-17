# How to Set Up Row-Level Security in BigQuery Using Row Access Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Security, Row-Level Security, Data Governance, Access Control

Description: Learn how to implement row-level security in BigQuery using row access policies to control which rows different users can see in shared tables.

---

Column-level security controls which fields users can see, but sometimes you need to control which rows they can access. A regional sales manager should only see data for their region. A department head should only see their department's records. A multi-tenant SaaS application should ensure each tenant only sees their own data. BigQuery row access policies let you define filter conditions that automatically restrict which rows different users can read from a table.

In this post, I will show you how to create and manage row access policies, handle common patterns like multi-region and multi-tenant access, and test that your policies work correctly.

## How Row Access Policies Work

A row access policy is a filter expression attached to a table that BigQuery evaluates for every query. The filter uses the identity of the user running the query to determine which rows are visible. If a user does not match any row access policy, they see zero rows. If they match one or more policies, they see the union of rows allowed by all matching policies.

Row access policies are transparent to the user. The query runs normally and returns results - it just silently excludes rows the user is not authorized to see. There is no error or indication that data was filtered, which makes it suitable for scenarios where you do not want users to even know about data they cannot access.

## Creating a Basic Row Access Policy

Here is a simple example. Say you have a sales table with a region column, and you want each regional team to see only their region's data.

```sql
-- Create a row access policy that restricts rows based on user group
CREATE ROW ACCESS POLICY region_filter
ON `my_project.sales.transactions`
-- Grant access to the filter function
GRANT TO ("group:sales-us@mycompany.com")
-- Only show rows where region is 'US'
FILTER USING (region = 'US');
```

Now create policies for other regions.

```sql
-- European sales team can only see European data
CREATE ROW ACCESS POLICY region_filter_eu
ON `my_project.sales.transactions`
GRANT TO ("group:sales-eu@mycompany.com")
FILTER USING (region = 'EU');

-- APAC sales team can only see APAC data
CREATE ROW ACCESS POLICY region_filter_apac
ON `my_project.sales.transactions`
GRANT TO ("group:sales-apac@mycompany.com")
FILTER USING (region = 'APAC');

-- Global leadership can see all rows
CREATE ROW ACCESS POLICY global_access
ON `my_project.sales.transactions`
GRANT TO ("group:sales-leadership@mycompany.com")
FILTER USING (TRUE);
```

The `FILTER USING (TRUE)` for leadership means no filter is applied - they see everything. This is the pattern for granting unrestricted access to specific groups.

## Using SESSION_USER for Dynamic Filtering

Instead of creating separate policies per group, you can use a mapping table that links users to their allowed data.

First, create a mapping table.

```sql
-- Create a table that maps users to their allowed regions
CREATE TABLE `my_project.security.user_region_access` (
  user_email STRING,
  allowed_region STRING
);

-- Insert the access mappings
INSERT INTO `my_project.security.user_region_access` VALUES
  ('alice@mycompany.com', 'US'),
  ('alice@mycompany.com', 'EU'),  -- Alice can see both US and EU
  ('bob@mycompany.com', 'APAC'),
  ('carol@mycompany.com', 'US');
```

Then create a row access policy that joins against this mapping table.

```sql
-- Dynamic row access policy using SESSION_USER()
CREATE ROW ACCESS POLICY dynamic_region_filter
ON `my_project.sales.transactions`
GRANT TO ("group:all-sales@mycompany.com")
FILTER USING (
  region IN (
    SELECT allowed_region
    FROM `my_project.security.user_region_access`
    WHERE user_email = SESSION_USER()
  )
);
```

Now when Alice queries the transactions table, she automatically sees US and EU rows. When Bob queries it, he sees only APAC rows. To change access, you just update the mapping table - no need to modify the row access policy itself.

## Multi-Tenant Row Access

For SaaS applications with multi-tenant data, row access policies can enforce tenant isolation.

```sql
-- Create a tenant access mapping table
CREATE TABLE `my_project.security.tenant_access` (
  service_account_email STRING,
  tenant_id STRING
);

-- Map service accounts to their tenant
INSERT INTO `my_project.security.tenant_access` VALUES
  ('tenant-a-sa@my-project.iam.gserviceaccount.com', 'tenant_a'),
  ('tenant-b-sa@my-project.iam.gserviceaccount.com', 'tenant_b');

-- Create the row access policy for tenant isolation
CREATE ROW ACCESS POLICY tenant_isolation
ON `my_project.saas.customer_data`
GRANT TO ("group:tenant-service-accounts@mycompany.com")
FILTER USING (
  tenant_id IN (
    SELECT tenant_id
    FROM `my_project.security.tenant_access`
    WHERE service_account_email = SESSION_USER()
  )
);

-- Admin access to all tenant data
CREATE ROW ACCESS POLICY admin_access
ON `my_project.saas.customer_data`
GRANT TO ("group:platform-admins@mycompany.com")
FILTER USING (TRUE);
```

## Managing Multiple Policies on One Table

When multiple row access policies exist on a table, a user sees rows that match any of the policies they are granted access to. The policies are combined with OR logic.

```sql
-- List all row access policies on a table
SELECT
  *
FROM
  `my_project.sales`.INFORMATION_SCHEMA.ROW_ACCESS_POLICIES
WHERE
  table_name = 'transactions';
```

To remove a policy that is no longer needed:

```sql
-- Drop a specific row access policy
DROP ROW ACCESS POLICY region_filter_apac
ON `my_project.sales.transactions`;

-- Drop all row access policies on a table
DROP ALL ROW ACCESS POLICIES ON `my_project.sales.transactions`;
```

## Important Behavior to Know

There are several important behaviors to understand about row access policies.

Once any row access policy exists on a table, all users are affected. Users who do not match any policy see zero rows. This means you must create a policy for every group that needs access, including admins and service accounts.

Row access policies apply to all query types, including SELECT, DML (INSERT, UPDATE, DELETE), and EXPORT. A user cannot modify or export rows they cannot see.

Row access policies do not apply to table owners. The user who owns the table (or has bigquery.admin role at the project level) can always see all rows. This is a safety mechanism to prevent lockout.

Performance impact is usually minimal. BigQuery evaluates the filter at query time, and for simple conditions (like equality checks on a column), the impact is negligible. For policies that involve subqueries against mapping tables, the mapping table should be small for best performance.

## Testing Row Access Policies

Always test your policies thoroughly before relying on them for data security.

```sql
-- Test as a specific user using impersonation (requires appropriate permissions)
-- First, check what SESSION_USER() returns
SELECT SESSION_USER();

-- Then verify the policy filters correctly
SELECT
  region,
  COUNT(*) AS row_count
FROM
  `my_project.sales.transactions`
GROUP BY
  region;
-- A user with only US access should see one row here: region='US'
```

For comprehensive testing, have team members from each access group run the same query and verify they see only their authorized data.

## Combining Row and Column Security

Row access policies work alongside column-level security. You can use both to create a comprehensive access control model.

```sql
-- Table with both row-level and column-level security
-- Column-level: email column has a PII policy tag
-- Row-level: users only see their region's data

-- A user in sales-us without PII access can query:
SELECT customer_id, region, transaction_amount
FROM `my_project.sales.transactions`;
-- They see only US rows, and cannot access the email column

-- A user in sales-us WITH PII access can query:
SELECT customer_id, email, region, transaction_amount
FROM `my_project.sales.transactions`;
-- They see only US rows, but can access the email column
```

## Auditing Row Access Policy Usage

Track how row access policies affect queries using INFORMATION_SCHEMA.

```sql
-- Check which jobs were affected by row access policies
SELECT
  job_id,
  user_email,
  creation_time,
  referenced_tables,
  query
FROM
  `region-us-central1`.INFORMATION_SCHEMA.JOBS
WHERE
  creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND EXISTS (
    SELECT 1
    FROM UNNEST(referenced_tables) AS t
    WHERE t.table_id = 'transactions'
  )
ORDER BY
  creation_time DESC;
```

## Wrapping Up

Row access policies provide a clean way to implement data segmentation without maintaining separate tables or views for each user group. The SESSION_USER approach with a mapping table is particularly powerful because it lets you manage access through data rather than DDL statements. Combined with column-level security using policy tags, you get a comprehensive data access control system that scales with your organization. Just remember to test thoroughly - when you add the first row access policy to a table, every user without a matching policy immediately loses access to all rows.
