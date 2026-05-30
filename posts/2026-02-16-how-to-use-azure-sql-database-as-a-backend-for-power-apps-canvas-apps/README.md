# How to Use Azure SQL Database as a Backend for Power Apps Canvas Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power Apps, Azure SQL, Canvas Apps, Power Platform, SQL Database, Data Gateway, Azure

Description: Step-by-step guide to connecting Power Apps Canvas Apps to Azure SQL Database for building data-rich business applications.

---

Dataverse is the default data layer for Power Apps, but it is not always the right fit. If your organization already runs Azure SQL Database for other workloads, using it as the backend for your Canvas Apps avoids data duplication and keeps everything in one place. This guide covers connecting Power Apps to Azure SQL, designing the data layer, and handling common issues.

## Why Azure SQL Over Dataverse?

There are valid reasons to choose Azure SQL Database instead of Dataverse:

- Your data already lives in Azure SQL and other systems depend on it.
- You need complex joins, stored procedures, or views that Dataverse does not support natively.
- Licensing costs for Dataverse storage exceed what you want to spend.
- Your SQL team is more comfortable managing schemas in T-SQL than in the Dataverse admin center.

That said, Dataverse has advantages like offline support, built-in security roles, and deep integration with model-driven apps. Weigh the tradeoffs before committing.

## Step 1: Prepare Your Azure SQL Database

Before connecting from Power Apps, make sure your Azure SQL Database is accessible. You need to configure the firewall to allow connections from Power Platform services.

1. In the Azure portal, go to your SQL server resource.
2. Under Security > Networking, add the outbound IP ranges or service tags used by Power Platform managed connectors for your region. Alternatively, toggle "Allow Azure services and resources to access this server" to Yes, but be aware that this allows access from Azure resources more broadly.
3. Make sure your database has a user account that Power Apps can use.

Here is a T-SQL script to create a dedicated user for Power Apps:

```sql
-- Connect directly to your target Azure SQL database before running this script.
-- Create a contained database user for SQL authentication.
CREATE USER PowerAppsUser WITH PASSWORD = 'YourStrongPassword123!';

-- Grant read and write permissions
ALTER ROLE db_datareader ADD MEMBER PowerAppsUser;
ALTER ROLE db_datawriter ADD MEMBER PowerAppsUser;

-- Grant execute permissions if you need stored procedures
GRANT EXECUTE TO PowerAppsUser;
```

Use a strong password and consider rotating it periodically. For production environments, consider using Azure AD authentication instead of SQL authentication.

## Step 2: Create Your Tables

Design your tables with Power Apps in mind. Power Apps works best with tables that have a single primary key column and avoid overly complex schemas.

```sql
-- Create a simple customers table that Power Apps can work with easily
-- The Id column with IDENTITY makes Power Apps auto-generate IDs
CREATE TABLE Customers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255),
    Phone NVARCHAR(50),
    CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedDate DATETIME2 DEFAULT GETUTCDATE()
);

-- Create an orders table with a foreign key to customers
CREATE TABLE Orders (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId INT NOT NULL REFERENCES Customers(Id),
    OrderDate DATETIME2 DEFAULT GETUTCDATE(),
    TotalAmount DECIMAL(18,2),
    Status NVARCHAR(50) DEFAULT 'Pending'
);
```

A few tips for table design:

- Use `NVARCHAR` instead of `VARCHAR` so Unicode characters work correctly in Power Apps.
- Use `IDENTITY` columns for primary keys when you want SQL Server to generate numeric IDs automatically.
- Add `CreatedDate` and `ModifiedDate` columns for auditing.
- Keep column names simple and avoid spaces or special characters.

## Step 3: Connect Power Apps to Azure SQL

There are two ways to connect: directly or through an on-premises data gateway. Since Azure SQL is a cloud service, a direct connection usually works.

1. Open Power Apps Studio and create a new Canvas App.
2. Go to Data > Add data > Search for "SQL Server".
3. Select the SQL Server connector.
4. Choose "Connect directly (cloud services)".
5. Enter your server name (e.g., `yourserver.database.windows.net`), database name, username, and password.
6. Select the tables you want to use.

Power Apps will generate a data source for each table. You can now reference these tables in formulas.

## Step 4: Build the App Interface

With the data source connected, build out your screens. Here is a common pattern for a list-detail app.

### Browse Screen

Add a Gallery control and set its Items property:

```text
// Filter customers based on search text
// SortByColumns sorts results alphabetically by last name
SortByColumns(
    Filter(
        '[dbo].[Customers]',
        StartsWith(LastName, TextSearchBox.Text)
    ),
    "LastName",
    SortOrder.Ascending
)
```

### Detail Screen

Add a Form control in View mode. Set its DataSource to `[dbo].[Customers]` and its Item to the selected gallery item:

```text
// Reference the selected customer from the gallery
BrowseGallery.Selected
```

### Edit Screen

Add a Form control in Edit mode. Wire up the submit button:

```text
// Submit the form changes back to Azure SQL
SubmitForm(EditForm)
```

Then set the form's OnSuccess property:

```text
// After submission, navigate back to the browse screen
Navigate(BrowseScreen, ScreenTransition.None)
```

## Step 5: Use Views for Complex Queries

Power Apps delegation has limits. Not all SQL operations can be pushed down to the server. When you need complex joins or aggregations, create a SQL view and connect to it from Power Apps.

```sql
-- Create a view that joins customers and orders
-- Power Apps can connect to this view like a table
CREATE VIEW vw_CustomerOrders AS
SELECT
    c.Id AS CustomerId,
    c.FirstName,
    c.LastName,
    c.Email,
    COUNT(o.Id) AS OrderCount,
    ISNULL(SUM(o.TotalAmount), 0) AS TotalSpent
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
GROUP BY c.Id, c.FirstName, c.LastName, c.Email;
```

Views appear as tables in the Power Apps data source picker. They are read-only by default, which is fine for reporting scenarios.

## Step 6: Handle Stored Procedures

For operations that go beyond simple CRUD, use stored procedures. Power Apps can call stored procedures through the SQL Server connector.

```sql
-- Stored procedure to place a new order
-- Power Apps can call this directly from a button action
CREATE PROCEDURE usp_PlaceOrder
    @CustomerId INT,
    @TotalAmount DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Orders (CustomerId, TotalAmount, Status)
    VALUES (@CustomerId, @TotalAmount, 'Pending');

    -- Update the customer's modified date
    UPDATE Customers
    SET ModifiedDate = GETUTCDATE()
    WHERE Id = @CustomerId;

    -- Return the new order ID
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewOrderId;
END;
```

Call it from Power Apps like this:

```text
// Execute the stored procedure and capture the result
// SQL stored procedure result sets are exposed under ResultSets.Table1
Set(
    varNewOrderId,
    First(
        'YourDB'.dbousp_PlaceOrder({
            CustomerId: varSelectedCustomer.Id,
            TotalAmount: Value(txtAmount.Text)
        }).ResultSets.Table1
    ).NewOrderId
);
```

## Understanding Delegation

Delegation is how Power Apps pushes query operations to the data source instead of loading all data into the app. Azure SQL supports delegation for many operations, but not all.

Delegable operations with SQL Server connector:
- Filter with =, <>, <, >, <=, >=
- StartsWith
- EndsWith when the column is the first argument
- LookUp
- Sort
- Search (on text columns)

Non-delegable operations:
- Complex nested filters
- Some formulas that apply functions in a way SQL Server cannot translate

When you use a non-delegable operation, Power Apps only processes the first 500 (or up to 2000) rows. The app will show a blue warning line under the formula. Take these warnings seriously since they mean your app might silently miss data.

## Performance Optimization

Azure SQL is fast, but the roundtrip through the Power Apps connector adds latency. Here are some tips:

**Reduce columns**: Use the `ShowColumns` function to shape the data passed to controls. For large SQL tables, prefer a SQL view when you need the server to return only selected columns:

```text
// Only keep the columns the gallery needs
ShowColumns(
    '[dbo].[Customers]',
    Id, FirstName, LastName, Email
)
```

**Use Concurrent for parallel loads**: If your app loads multiple data sources on startup:

```text
// Load multiple data sources in parallel
// This can reduce total loading time
Concurrent(
    ClearCollect(colCustomers, '[dbo].[Customers]'),
    ClearCollect(colOrders, '[dbo].[Orders]')
);
```

**Add indexes**: Make sure your SQL tables have indexes on columns used in Power Apps filters:

```sql
-- Index on LastName since the browse screen filters on it
CREATE INDEX IX_Customers_LastName ON Customers(LastName);

-- Index on CustomerId for the join in the orders view
CREATE INDEX IX_Orders_CustomerId ON Orders(CustomerId);
```

## Security Considerations

The SQL Server connector in Power Apps can use either explicit or implicit connections. With Microsoft Entra Integrated authentication, each user creates their own connection and SQL Server can evaluate that user's identity. With SQL Server authentication or a service principal, users share the credentials behind the app, so SQL Server sees the shared account instead of the individual app user.

To implement per-user security:

1. Prefer Microsoft Entra Integrated authentication when SQL Server must enforce permissions or Row-Level Security per user.
2. For shared SQL credentials, treat Power Apps filters such as `Filter('[dbo].[Customers]', UserEmail = User().Email)` as a user-experience filter, not a security boundary.
3. Enforce sensitive filtering on the server with SQL permissions, Row-Level Security, views, stored procedures, or a trusted business layer.

## Wrapping Up

Azure SQL Database is a solid backend for Power Apps Canvas Apps when your data already lives in SQL or when you need capabilities that Dataverse does not provide. The key steps are preparing your database with proper tables and permissions, connecting through the SQL Server connector, designing your app with delegation limits in mind, and optimizing performance with views, stored procedures, and indexes. Keep security in mind since the shared connection model means you need application-level filtering for multi-user scenarios.
