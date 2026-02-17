# How to Use Foreign Keys and Interleaved Tables in Cloud Spanner for Efficient Parent-Child Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Database Design, Interleaved Tables, Foreign Keys

Description: Understand the difference between foreign keys and interleaved tables in Cloud Spanner and learn when to use each approach for modeling parent-child relationships efficiently.

---

Cloud Spanner gives you two ways to model parent-child relationships between tables: traditional foreign keys and interleaved tables. Both enforce referential integrity, but they have very different performance characteristics. Choosing the right one can make or break your query performance at scale.

If you are coming from a traditional relational database background, foreign keys feel familiar. Interleaved tables, on the other hand, are unique to Spanner and take advantage of its distributed architecture. Let us dig into both, see how they work, and figure out when to pick each one.

## Foreign Keys in Cloud Spanner

Foreign keys in Spanner work much like they do in any relational database. They enforce that a value in one table corresponds to a value in another table. But unlike interleaved tables, foreign key relationships do not affect how data is physically stored.

Here is an example with a customers and orders schema:

```sql
-- Create a customers table with a UUID primary key
CREATE TABLE Customers (
  CustomerId STRING(36) NOT NULL,
  Name STRING(256) NOT NULL,
  Email STRING(256),
) PRIMARY KEY (CustomerId);

-- Create an orders table with a foreign key referencing customers
-- The foreign key ensures every order belongs to a valid customer
CREATE TABLE Orders (
  OrderId STRING(36) NOT NULL,
  CustomerId STRING(36) NOT NULL,
  OrderDate DATE NOT NULL,
  TotalAmount NUMERIC,
  CONSTRAINT FK_Orders_Customer FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId),
) PRIMARY KEY (OrderId);
```

With this setup, Spanner will reject any insert into Orders where the CustomerId does not exist in the Customers table. It will also reject deleting a Customer that still has Orders referencing it.

The key thing to understand is that Spanner may store Customers and Orders data on completely different nodes in the cluster. When you run a query that joins these two tables, Spanner might need to do a distributed join across nodes.

## Interleaved Tables: Co-located Data

Interleaved tables are Spanner's way of physically co-locating parent and child data. When you interleave a child table into a parent, Spanner stores the child rows alongside their parent row in the same split. This means that reading a parent and all its children requires touching only a single node, even in a massive distributed cluster.

Here is the same schema using interleaving:

```sql
-- Create the parent table
CREATE TABLE Customers (
  CustomerId STRING(36) NOT NULL,
  Name STRING(256) NOT NULL,
  Email STRING(256),
) PRIMARY KEY (CustomerId);

-- Create orders as an interleaved child of customers
-- The child's primary key must start with the parent's primary key columns
CREATE TABLE Orders (
  CustomerId STRING(36) NOT NULL,
  OrderId STRING(36) NOT NULL,
  OrderDate DATE NOT NULL,
  TotalAmount NUMERIC,
) PRIMARY KEY (CustomerId, OrderId),
  INTERLEAVE IN PARENT Customers ON DELETE CASCADE;
```

Notice two important structural differences. First, the Orders primary key starts with CustomerId - the parent's primary key. This is required for interleaving. Second, the INTERLEAVE IN PARENT clause tells Spanner to co-locate this data.

The ON DELETE CASCADE means that when a Customer is deleted, all their Orders are automatically deleted too. You can also use ON DELETE NO ACTION if you want to prevent deletion of a parent that still has children.

## How Interleaving Affects Storage

To understand why interleaving matters, think about how Spanner stores data. In a non-interleaved setup:

```
-- Physical storage (simplified): data is sorted by primary key within each table
Customers:
  [Customer-A, "Alice", "alice@example.com"]
  [Customer-B, "Bob", "bob@example.com"]

Orders:
  [Order-001, Customer-A, "2026-01-15", 99.99]
  [Order-002, Customer-B, "2026-01-16", 149.99]
  [Order-003, Customer-A, "2026-01-17", 29.99]
```

With interleaving, the storage layout changes to this:

```
-- Interleaved storage: child rows are stored next to their parent
  [Customer-A, "Alice", "alice@example.com"]
    [Customer-A, Order-001, "2026-01-15", 99.99]
    [Customer-A, Order-003, "2026-01-17", 29.99]
  [Customer-B, "Bob", "bob@example.com"]
    [Customer-B, Order-002, "2026-01-16", 149.99]
```

This co-location is the performance win. Fetching a customer and all their orders is a single-split read.

## Multi-Level Interleaving

You can interleave multiple levels deep. For example, orders can have line items:

```sql
-- Three-level hierarchy: Customers -> Orders -> LineItems
CREATE TABLE Customers (
  CustomerId STRING(36) NOT NULL,
  Name STRING(256) NOT NULL,
) PRIMARY KEY (CustomerId);

CREATE TABLE Orders (
  CustomerId STRING(36) NOT NULL,
  OrderId STRING(36) NOT NULL,
  OrderDate DATE NOT NULL,
) PRIMARY KEY (CustomerId, OrderId),
  INTERLEAVE IN PARENT Customers ON DELETE CASCADE;

-- LineItems interleaved under Orders
-- Primary key includes all ancestor keys plus its own
CREATE TABLE LineItems (
  CustomerId STRING(36) NOT NULL,
  OrderId STRING(36) NOT NULL,
  LineItemId STRING(36) NOT NULL,
  ProductName STRING(256) NOT NULL,
  Quantity INT64 NOT NULL,
  UnitPrice NUMERIC,
) PRIMARY KEY (CustomerId, OrderId, LineItemId),
  INTERLEAVE IN PARENT Orders ON DELETE CASCADE;
```

Now a single customer, all their orders, and all line items for those orders are stored together. A query like "give me customer A's complete order history with line items" reads from a single location.

## Querying Interleaved Tables

Joins on interleaved tables are efficient because Spanner knows the data is co-located:

```sql
-- This join is efficient because the data is physically co-located
-- Spanner does not need to do a distributed join
SELECT
  c.Name,
  o.OrderId,
  o.OrderDate,
  li.ProductName,
  li.Quantity,
  li.UnitPrice
FROM Customers c
JOIN Orders o ON c.CustomerId = o.CustomerId
JOIN LineItems li ON o.CustomerId = li.CustomerId AND o.OrderId = li.OrderId
WHERE c.CustomerId = 'customer-123';
```

You can also read a specific range of a hierarchy efficiently:

```sql
-- Read all orders for a specific customer without joining the parent table
-- This is a simple range scan within a single split
SELECT OrderId, OrderDate, TotalAmount
FROM Orders
WHERE CustomerId = 'customer-123'
ORDER BY OrderDate DESC;
```

## When to Use Foreign Keys vs. Interleaved Tables

The decision comes down to access patterns.

Use interleaved tables when you frequently read parents and children together, when the child data naturally belongs to one parent, and when the parent-child relationship is the primary access pattern. Good examples include user profiles with their settings, orders with their line items, and documents with their paragraphs.

Use foreign keys when the relationship is many-to-many, when you frequently query the child table independently of the parent, when child rows might reference different parents over time, or when the child table is very large relative to the parent. Good examples include products referenced by many orders, tags applied across different entities, and lookup tables shared by multiple other tables.

You can also combine both approaches. Use interleaving for the primary hierarchy and foreign keys for cross-cutting references:

```sql
-- Products table stands alone (not interleaved)
CREATE TABLE Products (
  ProductId STRING(36) NOT NULL,
  ProductName STRING(256) NOT NULL,
) PRIMARY KEY (ProductId);

-- LineItems is interleaved with Orders for co-location
-- but also has a foreign key to Products for referential integrity
CREATE TABLE LineItems (
  CustomerId STRING(36) NOT NULL,
  OrderId STRING(36) NOT NULL,
  LineItemId STRING(36) NOT NULL,
  ProductId STRING(36) NOT NULL,
  Quantity INT64 NOT NULL,
  CONSTRAINT FK_LineItems_Product FOREIGN KEY (ProductId) REFERENCES Products(ProductId),
) PRIMARY KEY (CustomerId, OrderId, LineItemId),
  INTERLEAVE IN PARENT Orders ON DELETE CASCADE;
```

## Size Considerations

There is a practical limit to interleaving. Spanner has a maximum split size (currently around 4GB). If a single parent row plus all its interleaved children exceeds this limit, Spanner will have trouble managing the data. For most use cases this is not a problem, but if you have a parent with millions of child rows, you should think carefully about whether interleaving is appropriate.

## Wrapping Up

Interleaved tables are one of Cloud Spanner's most powerful features, and they are something you will not find in traditional relational databases. By co-locating related data, they turn what would be expensive distributed joins into efficient local reads. Foreign keys remain the right choice for cross-cutting relationships where co-location does not make sense. In practice, most well-designed Spanner schemas use both - interleaving for the primary data hierarchy and foreign keys for everything else.
