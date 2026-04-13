# How to Use MongoDB Atlas SQL Interface (BI Connector)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, SQL, BI Connector, Analytics

Description: Learn how to connect BI tools to MongoDB Atlas using the Atlas SQL Interface and BI Connector to run SQL queries over MongoDB collections.

---

## What Is the Atlas SQL Interface

The Atlas SQL Interface (powered by the BI Connector / Atlas Data Federation) exposes MongoDB collections as relational tables queryable with standard SQL. BI tools like Tableau, Power BI, Looker, and Excel can connect via JDBC or ODBC without any ETL pipeline.

```mermaid
flowchart LR
    Tableau[Tableau / Power BI / Looker] -->|JDBC/ODBC| JDBC[MongoDB BI Connector\nor Atlas SQL Interface]
    Excel[Excel via ODBC] -->|ODBC| JDBC
    JDBC --> Atlas[(Atlas Cluster /\nData Federation)]
    Atlas --> Results[SQL result set]
    Results --> Tableau & Excel
```

## Two Connection Options

| Option | When to use |
|---|---|
| Atlas SQL via Data Federation | Managed; recommended for Atlas |
| Self-hosted BI Connector (`mongosqld`) | On-premises or self-managed MongoDB |

## Option 1: Atlas SQL Interface (Data Federation)

Atlas Data Federation exposes a SQL endpoint. No additional software is needed.

### Enable Atlas SQL in the UI

1. In Atlas UI go to **Data Federation**.
2. Create or select an existing federated database instance.
3. Under **Connect** choose **Connect with BI Connector for Atlas**.
4. Copy the SQL connection string.

### Connect with the JDBC Driver

```bash
# Download the MongoDB JDBC driver
# https://github.com/mongodb/mongo-jdbc-driver/releases

# JDBC connection string format:
# jdbc:mongodb://<username>:<password>@<federated-host>:27017/<database>?ssl=true&authSource=$external&authMechanism=PLAIN
```

### Run SQL Queries Against Atlas Data

```sql
-- List tables (collections) available
SHOW TABLES;

-- Describe a collection's inferred schema
DESCRIBE orders;

-- Query a MongoDB collection with SQL
SELECT
  o._id,
  o.customerId,
  o.total,
  o.status,
  o.createdAt
FROM orders o
WHERE o.status = 'shipped'
  AND o.createdAt >= '2026-01-01'
ORDER BY o.createdAt DESC
LIMIT 100;

-- JOIN two collections
SELECT
  o._id AS order_id,
  u.name AS customer_name,
  u.email,
  o.total
FROM orders o
JOIN users u ON o.customerId = u._id
WHERE o.total > 100;

-- Aggregation
SELECT
  DATE_FORMAT(createdAt, '%Y-%m') AS month,
  COUNT(*)                        AS order_count,
  SUM(total)                      AS revenue,
  AVG(total)                      AS avg_order
FROM orders
GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
ORDER BY month DESC;
```

## Option 2: Self-Hosted BI Connector (mongosqld)

Use the self-hosted BI Connector when connecting to a non-Atlas MongoDB deployment.

```bash
# Install the MongoDB Connector for BI
# https://www.mongodb.com/try/download/bi-connector

# Start mongosqld pointing at your MongoDB instance
mongosqld \
  --mongo-uri "mongodb://user:pass@localhost:27017" \
  --addr 0.0.0.0:3307 \
  --auth

# mongosqld listens on port 3307 (MySQL wire protocol)
# Connect with any MySQL client or JDBC/ODBC driver
```

## Connecting Tableau to Atlas SQL

```text
1. Open Tableau Desktop.
2. Under "Connect" choose "MongoDB BI Connector".
3. Enter:
   Server:   <atlas-federated-host>
   Port:     27015 (or the federation SQL port)
   Database: <your-database-name>
   Username: <atlas-username>
   Password: <atlas-password>
4. Click "Sign In".
5. Tableau will list collections as tables.
6. Drag and drop to build visualisations.
```

## Connecting Excel (ODBC)

```text
1. Install the MongoDB ODBC Driver.
   https://github.com/mongodb/mongo-odbc-driver/releases
2. Open "ODBC Data Sources (64-bit)" in Windows.
3. Add a new DSN:
   Driver: MongoDB ODBC 2.0 Unicode Driver
   Host:   <atlas-federated-host>
   Port:   27017
   Database: <database-name>
   User/Pass: Atlas credentials
4. In Excel: Data > Get Data > From ODBC > Select your DSN.
5. Import or query the data.
```

## Schema Sampling and Custom Schema

The BI Connector samples documents to infer a relational schema. For collections with varied document shapes you can provide a custom schema file.

```yaml
# custom_schema.drdl (Document Relational Definition Language)
schema:
- db: ecommerce
  tables:
  - table: orders
    collection: orders
    pipeline:
    - $unwind: "$items"
    columns:
    - Name: _id
      MongoType: bson.ObjectId
      SqlName: _id
      SqlType: varchar(255)
    - Name: total
      MongoType: float64
      SqlName: total
      SqlType: double
    - Name: status
      MongoType: string
      SqlName: status
      SqlType: varchar(255)
    - Name: items.sku
      MongoType: string
      SqlName: item_sku
      SqlType: varchar(255)
    - Name: items.price
      MongoType: float64
      SqlName: item_price
      SqlType: double
```

```bash
# Start mongosqld with custom schema
mongosqld \
  --mongo-uri "mongodb://localhost:27017" \
  --schema ./custom_schema.drdl \
  --addr 0.0.0.0:3307
```

## Performance Tips

- Add indexes on fields used in SQL `WHERE` clauses; the BI Connector translates SQL predicates to MQL and uses indexes.
- Limit schema sampling depth to reduce startup time on large collections.
- Use Atlas Data Federation's partition pruning by including partition fields in SQL `WHERE` clauses.
- For aggregation-heavy BI queries, pre-aggregate data into summary collections.

## Summary

The MongoDB Atlas SQL Interface and BI Connector translate SQL queries into MQL and execute them against Atlas or a self-managed MongoDB deployment. Enable the Atlas SQL endpoint in Data Federation, download the JDBC/ODBC driver, and connect Tableau, Power BI, Looker, or Excel directly. Use custom DRDL schema files for collections with complex nested structures or array fields that need to be flattened into relational rows.
