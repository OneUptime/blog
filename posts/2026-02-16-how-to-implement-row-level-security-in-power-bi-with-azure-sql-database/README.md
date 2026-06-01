# How to Implement Row-Level Security in Power BI with Azure SQL Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power BI, Row-Level Security, Azure SQL, Data Security, RLS, Power Platform, DAX

Description: Implement row-level security in Power BI reports backed by Azure SQL Database to restrict data access based on user identity and roles.

---

Row-level security (RLS) ensures that each user sees only the data they are authorized to access. A sales manager for the West region should only see West region data, even though the underlying dataset contains all regions. Without RLS, you would need separate reports for each region, which is a maintenance nightmare.

There are two places to implement RLS when using Power BI with Azure SQL Database: in Power BI using DAX, or in Azure SQL using the database's native RLS feature. This guide covers both approaches, explains when to use each, and walks through implementation step by step.

## Understanding the Two Approaches

### Power BI RLS (DAX-Based)

- Defined in Power BI Desktop using DAX filter expressions.
- Managed in the Power BI service where roles are mapped to users/groups.
- Works regardless of the data source (Azure SQL, Excel, Dataverse, etc.).
- Filters data after it is loaded into the Power BI dataset.

### Azure SQL RLS (Database-Level)

- Defined in Azure SQL using security policies and predicate functions.
- Managed in the database using database roles.
- Filters data at the database engine level before it reaches Power BI.
- Works with DirectQuery since the filtering happens server-side.

For Import mode, either approach works. For DirectQuery, database-level RLS is more efficient because filtering happens before data leaves the database.

## Approach 1: Power BI RLS with DAX

### Step 1: Set Up the Data Model

First, create a user-region mapping table in your Azure SQL database:

```sql
-- Table that maps users to the data they can access
-- Each user can be assigned to one or more regions
CREATE TABLE dbo.UserRegionMapping (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserEmail NVARCHAR(200) NOT NULL,
    Region NVARCHAR(100) NOT NULL,
    AccessLevel NVARCHAR(50) DEFAULT 'Read'
);

-- Add sample mappings
INSERT INTO dbo.UserRegionMapping (UserEmail, Region) VALUES
('alice@contoso.com', 'West'),
('alice@contoso.com', 'Central'),
('bob@contoso.com', 'East'),
('charlie@contoso.com', 'West'),
('manager@contoso.com', 'West'),
('manager@contoso.com', 'East'),
('manager@contoso.com', 'Central');
```

### Step 2: Import Both Tables

In Power BI Desktop, connect to Azure SQL and import:

1. The main data table (e.g., `Sales`)
2. The `UserRegionMapping` table

Create a relationship between the two:
- From `UserRegionMapping[Region]` to `Sales[Region]`
- Many-to-many (if users can access multiple regions)
- Single direction from UserRegionMapping to Sales

### Step 3: Create RLS Roles in Power BI Desktop

1. Go to Modeling > Manage roles.
2. Click Create.
3. Name the role "RegionFilter".
4. Select the `UserRegionMapping` table.
5. Enter the DAX filter expression:

```text
// Filter the mapping table to only show rows where the UserEmail
// matches the current Power BI user's email address
// USERPRINCIPALNAME() returns the logged-in user's email
[UserEmail] = USERPRINCIPALNAME()
```

This filter on `UserRegionMapping` cascades through the relationship to filter the `Sales` table, so each user only sees sales data for their assigned regions.

### Step 4: Test the Roles

In Power BI Desktop:

1. Go to Modeling > View as roles.
2. Check "RegionFilter".
3. Enter a test user email (e.g., `alice@contoso.com`) in the "Other user" field.
4. Click OK.

The report should now show only data for the West and Central regions (Alice's assigned regions). Verify the numbers match what you expect.

### Step 5: Publish and Assign Users

1. Publish the report to Power BI service.
2. Go to the dataset in the workspace.
3. Click the three dots > Security.
4. Select the "RegionFilter" role.
5. Add users or Azure AD security groups.

For large organizations, use security groups instead of individual users. Create an Azure AD group for each region and add the group to the RLS role.

## Approach 2: Azure SQL RLS (Database-Level)

This approach pushes the filtering down to the database, which is better for DirectQuery.

### Step 1: Create the Security Function

```sql
-- Create a schema for security objects
CREATE SCHEMA Security;
GO

-- Create a predicate function that checks if the current user
-- has access to a given region
-- USER_NAME() is evaluated from the Microsoft Entra identity
-- Power BI passes to Azure SQL when DirectQuery SSO is enabled
CREATE FUNCTION Security.fn_RegionFilter(@Region NVARCHAR(100))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS AccessGranted
    FROM dbo.UserRegionMapping
    WHERE UserEmail = USER_NAME()
      AND Region = @Region;
GO
```

### Step 2: Create the Security Policy

```sql
-- Create a security policy that applies the filter function
-- to the Sales table on the Region column
CREATE SECURITY POLICY Security.SalesFilter
    ADD FILTER PREDICATE Security.fn_RegionFilter(Region) ON dbo.Sales
    WITH (STATE = ON);
GO
```

Now, any query against the `Sales` table automatically filters based on the database user name returned by `USER_NAME()`. For Microsoft Entra users in Azure SQL Database, this is typically the user's UPN, such as `alice@contoso.com`, as long as the database user names match the values in `UserRegionMapping`.

### Step 3: Enable Single Sign-On from Power BI

Power BI DirectQuery can pass the report viewer's Microsoft Entra identity to Azure SQL Database by using single sign-on (SSO). In Power BI service:

1. Publish the report and semantic model.
2. Go to the semantic model settings.
3. Open the Data source credentials or Data sources section.
4. Enable single sign-on (SSO) for the Azure SQL Database connection.

When SSO is enabled, Power BI sends the viewer's authenticated Microsoft Entra credentials in DirectQuery queries to Azure SQL Database. This allows Azure SQL RLS predicates based on `USER_NAME()` or similar SQL identity functions to run under the viewer's identity.

Note: This requires Microsoft Entra authentication to be configured for Azure SQL Database, and each report viewer must have a corresponding database user and the required database permissions. SSO applies to DirectQuery connections, not Import mode refreshes.

### Alternative: Use SESSION_CONTEXT for Applications

If a middle-tier application connects to Azure SQL using a shared database user, the application can set `SESSION_CONTEXT` after opening the database connection. That pattern is useful outside Power BI, or in custom embedded scenarios where your application controls the SQL connection:

```sql
-- Predicate using a session-context value set by the application
CREATE FUNCTION Security.fn_RegionFilter(@Region NVARCHAR(100))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS AccessGranted
    FROM dbo.UserRegionMapping
    WHERE UserEmail = CAST(SESSION_CONTEXT(N'UserEmail') AS NVARCHAR(200))
      AND Region = @Region;
GO
```

For regular Power BI DirectQuery reports, use Microsoft Entra SSO instead of trying to set `SESSION_CONTEXT` in Power Query.

## Testing RLS

### Test in Power BI Desktop

Use the "View as roles" feature to impersonate different users and verify the filtering works correctly.

### Test in Azure SQL

Execute queries as different database users to verify database-level RLS:

```sql
-- Run as a test database user whose name matches UserRegionMapping.UserEmail
EXECUTE AS USER = 'alice@contoso.com';

-- This query should only return West and Central region data
SELECT Region, COUNT(*) AS OrderCount, SUM(TotalAmount) AS TotalRevenue
FROM dbo.Sales
GROUP BY Region;

REVERT;
```

Run this for each user to confirm they see only their authorized data.

### Test in Power BI Service

1. Share the report with a test user.
2. Have them open the report.
3. Verify they see only their region's data.
4. Check the totals against a known-good query.

## Performance Considerations

### Power BI RLS Performance

- The DAX filter runs after data is loaded into memory. For Import mode, this adds a small overhead to each query.
- If the `UserRegionMapping` table is large (many users and regions), keep it lean - only include the columns needed for filtering.
- Test with the largest role assignment to measure worst-case performance.

### Azure SQL RLS Performance

- The security predicate runs on every query against the table. Make sure the predicate function is efficient.
- Add indexes to support the predicate:

```sql
-- Index to speed up the RLS predicate lookup
CREATE INDEX IX_UserRegionMapping_Email_Region
ON dbo.UserRegionMapping (UserEmail, Region);
```

- For large tables, consider partitioning by the filter column (Region in this case).

## Handling Special Roles

### Admin/Manager Role

Some users (like admins) should see all data. Handle this in the DAX expression:

```text
// Allow admins to see all data by checking a separate admin table
// Regular users are filtered by region mapping
[UserEmail] = USERPRINCIPALNAME()
|| LOOKUPVALUE(
    AdminUsers[IsAdmin],
    AdminUsers[UserEmail],
    USERPRINCIPALNAME(),
    FALSE()
) = TRUE()
```

Or in SQL:

```sql
-- Admin bypass in the predicate function
-- If the user is in the Admins table, grant access to all rows
CREATE FUNCTION Security.fn_RegionFilter(@Region NVARCHAR(100))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS AccessGranted
    FROM dbo.UserRegionMapping
    WHERE UserEmail = USER_NAME()
      AND Region = @Region
    UNION ALL
    SELECT 1 AS AccessGranted
    FROM dbo.AdminUsers
    WHERE UserEmail = USER_NAME();
GO
```

### Hierarchical Security

For organizational hierarchies (manager sees their team's data plus their own), add a hierarchy table:

```sql
-- Hierarchy table: managers can see data for users they manage
CREATE TABLE dbo.UserHierarchy (
    ManagerEmail NVARCHAR(200),
    ReportEmail NVARCHAR(200)
);

-- Include hierarchy in the predicate
-- A user can see their own data and data of their reports
```

This gets complex quickly. Document the security logic clearly and test every scenario.

## Wrapping Up

Row-level security in Power BI with Azure SQL Database can be implemented at the Power BI level with DAX or at the database level with SQL security policies. DAX-based RLS is simpler to set up and works with any data source in Import mode. Database-level RLS is more performant for DirectQuery and provides defense-in-depth since the data is filtered before leaving the database. For most organizations, starting with Power BI DAX-based RLS is the practical choice, with database-level RLS as an upgrade for DirectQuery scenarios or when you need database-level security guarantees.
