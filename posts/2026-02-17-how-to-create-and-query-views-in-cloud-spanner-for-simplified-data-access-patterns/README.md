# How to Create and Query Views in Cloud Spanner for Simplified Data Access Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Database, SQL, Views

Description: Learn how to create and query views in Cloud Spanner to simplify complex data access patterns, reduce query duplication, and improve developer productivity.

---

If you have been working with Cloud Spanner for a while, you have probably noticed that certain queries keep showing up over and over across different parts of your application. Maybe it is a join between three tables that every microservice needs, or a filtered subset of data that multiple dashboards rely on. This is exactly where Cloud Spanner views come in handy.

Views in Cloud Spanner work similarly to views in traditional relational databases. They give you a named, reusable SQL query that acts like a virtual table. You do not store any extra data - the view just wraps your query and makes it available for other queries to reference.

## Why Use Views in Cloud Spanner?

There are a few practical reasons to reach for views:

- **Reduce query duplication.** If 10 different services run the same complex join, you can define it once as a view.
- **Abstract complexity.** Downstream consumers do not need to know about the underlying table structure. They just query the view.
- **Enforce consistency.** When business logic changes, you update the view definition in one place instead of hunting down every query.
- **Control access.** You can grant read access to a view without exposing the underlying tables directly.

That said, views in Cloud Spanner are not materialized. They do not cache results. Every time you query a view, Spanner runs the underlying query. Keep that in mind for performance planning.

## Creating Your First View

The syntax for creating a view in Cloud Spanner is straightforward. Let's say you have an `Orders` table and a `Customers` table, and you frequently need to pull order details along with customer information.

Here is the table schema for reference:

```sql
-- Orders table with a foreign key to Customers
CREATE TABLE Customers (
  CustomerId INT64 NOT NULL,
  Name STRING(256),
  Email STRING(256),
  Region STRING(64),
) PRIMARY KEY (CustomerId);

-- Orders table linked to Customers
CREATE TABLE Orders (
  OrderId INT64 NOT NULL,
  CustomerId INT64 NOT NULL,
  Amount FLOAT64,
  Status STRING(32),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (OrderId);
```

Now, to create a view that joins these two tables:

```sql
-- Create a view that combines order and customer data
CREATE VIEW OrderDetails
SQL SECURITY INVOKER
AS
SELECT
  o.OrderId,
  o.Amount,
  o.Status,
  o.CreatedAt,
  c.Name AS CustomerName,
  c.Email AS CustomerEmail,
  c.Region AS CustomerRegion
FROM Orders o
JOIN Customers c ON o.CustomerId = c.CustomerId;
```

The `SQL SECURITY INVOKER` clause is important. It means the view runs with the permissions of the user querying it, not the user who created it. Cloud Spanner currently requires this setting for all views.

## Querying Views

Once the view exists, you query it just like a regular table:

```sql
-- Query the view to get all pending orders with customer info
SELECT OrderId, CustomerName, Amount
FROM OrderDetails
WHERE Status = 'PENDING'
ORDER BY CreatedAt DESC;
```

You can also use views inside other queries, joins, subqueries, and aggregations:

```sql
-- Aggregate order amounts by region using the view
SELECT
  CustomerRegion,
  COUNT(*) AS OrderCount,
  SUM(Amount) AS TotalRevenue
FROM OrderDetails
WHERE CreatedAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY CustomerRegion
ORDER BY TotalRevenue DESC;
```

This keeps your application code clean. Instead of constructing a multi-table join every time, you just reference `OrderDetails`.

## Views with Filtered Data

Views are also useful for creating filtered subsets of data. Suppose you want a view that only shows high-value orders:

```sql
-- View for orders above $1000, useful for the finance team
CREATE VIEW HighValueOrders
SQL SECURITY INVOKER
AS
SELECT
  o.OrderId,
  o.Amount,
  o.Status,
  o.CreatedAt,
  c.Name AS CustomerName,
  c.Region AS CustomerRegion
FROM Orders o
JOIN Customers c ON o.CustomerId = c.CustomerId
WHERE o.Amount > 1000.0;
```

Now the finance team can just do:

```sql
-- Simple query against the filtered view
SELECT * FROM HighValueOrders
WHERE Status = 'COMPLETED'
ORDER BY Amount DESC
LIMIT 50;
```

## Managing Views

To update a view, you use `CREATE OR REPLACE VIEW`:

```sql
-- Update the view to include a new column
CREATE OR REPLACE VIEW OrderDetails
SQL SECURITY INVOKER
AS
SELECT
  o.OrderId,
  o.Amount,
  o.Status,
  o.CreatedAt,
  c.Name AS CustomerName,
  c.Email AS CustomerEmail,
  c.Region AS CustomerRegion,
  c.CustomerId  -- Added customer ID to the view
FROM Orders o
JOIN Customers c ON o.CustomerId = c.CustomerId;
```

To remove a view:

```sql
-- Drop the view when it is no longer needed
DROP VIEW HighValueOrders;
```

You can list all views in your database by querying the information schema:

```sql
-- List all views in the current database
SELECT TABLE_NAME, VIEW_DEFINITION
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_SCHEMA = '';
```

## Working with Views in Application Code

Here is how you would query a Cloud Spanner view from a Node.js application using the Spanner client library:

```javascript
// Query the OrderDetails view from a Node.js application
const {Spanner} = require('@google-cloud/spanner');

const spanner = new Spanner({projectId: 'my-project'});
const instance = spanner.instance('my-instance');
const database = instance.database('my-database');

async function getRecentOrders() {
  // Use the view just like a regular table in your query
  const query = {
    sql: `SELECT OrderId, CustomerName, Amount, Status
          FROM OrderDetails
          WHERE CreatedAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
          ORDER BY CreatedAt DESC
          LIMIT 100`,
  };

  const [rows] = await database.run(query);

  rows.forEach(row => {
    const json = row.toJSON();
    console.log(`Order ${json.OrderId}: ${json.CustomerName} - $${json.Amount}`);
  });
}

getRecentOrders().catch(console.error);
```

## Performance Considerations

Since views are not materialized, there are a few things to keep in mind:

1. **Indexing still matters.** The query optimizer uses indexes on the underlying tables. Make sure you have appropriate indexes for the columns referenced in your view's WHERE, JOIN, and ORDER BY clauses.

2. **Complex views can be expensive.** A view that joins five tables with multiple filters will cost the same as running that query directly. Views do not add any performance optimization - they are purely a convenience layer.

3. **Nested views are possible but risky.** You can create a view that references another view. This works, but it can make debugging slow queries harder. Try to keep your view hierarchy shallow.

4. **Use secondary indexes.** If your view filters on specific columns, create secondary indexes on those columns in the base tables:

```sql
-- Index to support queries that filter by status and creation time
CREATE INDEX OrdersByStatusAndDate
ON Orders(Status, CreatedAt DESC);
```

## Limitations to Know About

Cloud Spanner views come with a few restrictions:

- Views are read-only. You cannot INSERT, UPDATE, or DELETE through a view.
- You cannot create indexes on views.
- Views must use `SQL SECURITY INVOKER`.
- The underlying query cannot use DML statements or procedural logic.
- Schema changes to base tables can break views if columns are removed or renamed.

## Putting It All Together

Views in Cloud Spanner are a practical tool for cleaning up your data access layer. They will not make your queries faster, but they will make your codebase more maintainable. Start by identifying the queries that get repeated most often across your services, wrap them in views, and let your application code focus on what matters.

For teams running multiple microservices against the same Spanner database, views are especially valuable because they create a shared contract for how data should be accessed. Instead of each service building its own version of a complex join, everyone uses the same view definition.

If you are monitoring your Cloud Spanner queries with a tool like OneUptime, you will notice that view-based queries show up with the expanded query in your traces, which makes debugging straightforward even when the original application code just references the view name.
