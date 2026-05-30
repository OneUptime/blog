# How to Use Power BI DirectQuery Mode with Azure Cosmos DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power BI, Azure Cosmos DB, DirectQuery, NoSQL, Analytics, Data Visualization, Azure

Description: Configure Power BI DirectQuery mode with Azure Cosmos DB to build interactive reports over large NoSQL datasets without importing data.

---

Azure Cosmos DB is a globally distributed NoSQL database that handles massive volumes of transactional data. Power BI can connect to Azure Cosmos DB data by importing data with the native connector, by using DirectQuery through Azure Synapse Link and serverless SQL views for existing Synapse Link projects, or by using Microsoft Fabric mirroring with Direct Lake for new projects. DirectQuery is the better choice when your Cosmos DB dataset is too large to import, changes frequently, or when you need reports that query the analytical copy instead of loading the data into Power BI.

This guide covers connecting Power BI to Cosmos DB in DirectQuery mode, handling the NoSQL-to-tabular translation, optimizing performance, and working around common limitations.

## When to Use DirectQuery with Cosmos DB

DirectQuery is the right choice when:

- Your Cosmos DB collection has millions of documents and importing them all would exceed Power BI memory limits.
- The data changes frequently and you need reports to reflect near-real-time data after analytical replication and report refresh.
- You want to avoid scheduling refreshes and managing dataset sizes.
- Your Cosmos DB container is the authoritative source and you want to report on it directly.

Import mode is better when:

- The dataset is small enough to fit in memory (under a few million rows).
- You need complex DAX calculations or transformations that do not fold well in DirectQuery.
- Dashboard performance is the top priority and data freshness can lag.

## Step 1: Prepare Your Cosmos DB Container

Before connecting Power BI, make sure your Cosmos DB container is set up for analytical queries.

### Enable Analytical Store (Recommended)

Azure Cosmos DB analytical store is a column-oriented store that runs alongside the transactional row store. It is optimized for analytical queries and is the store used by Azure Synapse Link and Synapse serverless SQL for Power BI DirectQuery.

For new containers:

1. Go to your Cosmos DB account in the Azure portal.
2. Click Data Explorer > New Container.
3. Under Analytical store, select On.
4. Set the analytical TTL (Time to Live) to -1 for no expiration.

The analytical store syncs automatically from the transactional store with no performance impact on your production workloads.

You can also enable analytical store on existing API for NoSQL containers from the Azure portal, Azure CLI, PowerShell, or Azure Cosmos DB SDKs. For new analytics projects, Microsoft recommends Azure Cosmos DB mirroring in Microsoft Fabric instead of starting a new Synapse Link project.

### Index Design

Cosmos DB indexes all properties by default, which is good for transactional queries but can be expensive. For analytical queries through Power BI, the analytical store handles indexing separately.

If you are not using analytical store and are importing from the transactional store with the native connector, make sure your indexing policy includes the properties used in Power BI filters:

```json
{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
        { "path": "/customerId/?" },
        { "path": "/orderDate/?" },
        { "path": "/status/?" },
        { "path": "/totalAmount/?" },
        { "path": "/*" }
    ],
    "compositeIndexes": [
        [
            { "path": "/status", "order": "ascending" },
            { "path": "/orderDate", "order": "descending" }
        ]
    ]
}
```

### Sample Document Structure

For this guide, we will use an orders collection:

```json
{
    "id": "order-12345",
    "customerId": "cust-789",
    "customerName": "Acme Corp",
    "orderDate": "2026-01-15T10:30:00Z",
    "status": "Shipped",
    "items": [
        {
            "productId": "prod-001",
            "productName": "Widget A",
            "quantity": 5,
            "unitPrice": 29.99
        },
        {
            "productId": "prod-002",
            "productName": "Widget B",
            "quantity": 2,
            "unitPrice": 49.99
        }
    ],
    "totalAmount": 249.93,
    "shippingAddress": {
        "city": "Seattle",
        "state": "WA",
        "country": "US"
    },
    "region": "US-West"
}
```

## Step 2: Connect Power BI Desktop

### Using the Native Cosmos DB Connector for Import Mode

1. Open Power BI Desktop.
2. Click Get Data > Azure > Azure Cosmos DB.
3. Enter the connection details:
   - URL: Your Cosmos DB account endpoint (e.g., `https://your-account.documents.azure.com:443/`)
4. Click OK.
5. Authenticate with your account key or Microsoft Entra ID credentials.
6. Select the database and container.

The native Azure Cosmos DB connector is only available in import mode and consumes request units (RUs) from your transactional workload when it reads data.

### Choose DirectQuery Mode Through an Analytical Layer

To use DirectQuery, connect Power BI to a relational analytical layer over Cosmos DB data, such as Synapse serverless SQL views for existing Synapse Link projects:

1. Create Synapse serverless SQL views over the Cosmos DB analytical store.
2. In Power BI Desktop, choose Get Data > Azure > Azure Synapse Analytics (SQL DW) or Azure SQL Database.
3. Enter the serverless SQL endpoint.
4. Select DirectQuery as the data connectivity mode.
5. Select the database and views.

If you are starting a new project, use the Microsoft Fabric mirroring alternative described below.

### Existing Projects: Use Synapse Link for Cosmos DB

Azure Synapse Link for Cosmos DB provides a DirectQuery experience for existing Synapse Link projects. Microsoft no longer supports Synapse Link for new Cosmos DB projects, so use Fabric mirroring for new work:

1. Enable Synapse Link on your Cosmos DB account.
2. In Power BI, connect to the Synapse Analytics serverless SQL pool.
3. Query the Cosmos DB analytical store through Synapse views.

This approach gives you:
- Better DirectQuery performance than querying the transactional store for analytics.
- T-SQL interface that Power BI handles natively.
- Ability to join Cosmos DB data with other data lake sources.

```sql
-- Create a view in Synapse serverless SQL pool over Cosmos DB analytical store
CREATE VIEW dbo.vw_Orders AS
SELECT
    doc.id AS OrderId,
    doc.customerId AS CustomerId,
    doc.customerName AS CustomerName,
    doc.orderDate AS OrderDate,
    doc.status AS Status,
    doc.totalAmount AS TotalAmount,
    doc.city AS City,
    doc.state AS State,
    doc.region AS Region
FROM OPENROWSET(
    'CosmosDB',
    'Account=your-account;Database=sales;Region=westus2;Key=YOUR_KEY',
    orders
) WITH (
    id VARCHAR(100),
    customerId VARCHAR(100),
    customerName VARCHAR(200),
    orderDate VARCHAR(30),
    status VARCHAR(50),
    totalAmount FLOAT,
    city VARCHAR(100) '$.shippingAddress.city',
    state VARCHAR(100) '$.shippingAddress.state',
    region VARCHAR(50)
) AS doc;
```

### New Projects: Use Microsoft Fabric Mirroring

Microsoft Fabric mirroring continuously replicates Azure Cosmos DB for NoSQL data into OneLake without consuming transactional RUs for replication. Power BI can then use Direct Lake mode over the mirrored data, and the generated SQL analytics endpoint can be used for T-SQL views when you need to flatten JSON.

## Step 3: Handle Nested Documents

Cosmos DB documents are often nested, but Power BI works with flat tables. You need to flatten the data.

### Flatten in Power Query

In Power Query Editor, expand nested objects:

1. Select the column containing the nested object (e.g., `shippingAddress`).
2. Click the expand icon.
3. Select the fields you want to extract (city, state, country).
4. Click OK.

For arrays like `items`, expand them to create one row per item:

1. Select the `items` column.
2. Click "Expand to New Rows" to create separate rows for each item.
3. Then expand the item object to get productName, quantity, etc.

Be careful with array expansion in DirectQuery mode - it can generate expensive queries against the analytical source.

### Flatten in Synapse Views

If using Synapse Link, flatten in SQL:

```sql
-- Flatten the items array using CROSS APPLY and OPENJSON
-- Each item becomes a separate row in the result
CREATE VIEW dbo.vw_OrderItems AS
SELECT
    doc.id AS OrderId,
    doc.customerName AS CustomerName,
    doc.orderDate AS OrderDate,
    item.productName,
    item.quantity,
    item.unitPrice,
    item.quantity * item.unitPrice AS lineTotal
FROM OPENROWSET(
    'CosmosDB',
    'Account=your-account;Database=sales;Region=westus2;Key=YOUR_KEY',
    orders
) WITH (
    id VARCHAR(100),
    customerName VARCHAR(200),
    orderDate VARCHAR(30),
    items VARCHAR(MAX) '$.items'
) AS doc
CROSS APPLY OPENJSON(doc.items) WITH (
    productName VARCHAR(200),
    quantity INT,
    unitPrice FLOAT
) AS item;
```

## Step 4: Build the Report

With the connection established, build your report:

### Key Visuals

**Bar Chart - Orders by Status**
- X-axis: Status
- Y-axis: Count of OrderId

**Line Chart - Order Trend**
- X-axis: OrderDate (by month)
- Y-axis: Sum of TotalAmount

**Map - Orders by Region**
- Location: City or Region
- Size: Count of orders

**Table - Recent Orders**
- Columns: OrderId, CustomerName, OrderDate, Status, TotalAmount

### Measure Definitions

In DirectQuery mode, you can still create DAX measures, but not all DAX functions work:

```text
// Measure: Total Revenue
// Simple aggregation works well in DirectQuery mode
Total Revenue = SUM(Orders[TotalAmount])

// Measure: Average Order Value
Avg Order Value = AVERAGE(Orders[TotalAmount])

// Measure: Order Count
Order Count = COUNTROWS(Orders)
```

Complex DAX functions, iterators like SUMX, and time intelligence calculations can generate expensive source queries in DirectQuery models. Calculated columns and row-level security rules also have more restrictions in DirectQuery than in import models. Test each measure and check whether it generates reasonable query plans.

## Step 5: Optimize Performance

DirectQuery performance depends on how efficiently Power BI queries translate to the analytical source.

### Reduce Visual Count

Each visual on a report page generates one or more queries. More visuals means more concurrent queries against the analytical source. Keep pages focused with 6-8 visuals maximum.

### Use Aggregation Tables

If certain queries are slow, create pre-aggregated views:

```sql
-- Pre-aggregated view for monthly summaries
-- Drastically reduces the data scanned for dashboard tiles
CREATE VIEW dbo.vw_MonthlyOrderSummary AS
SELECT
    LEFT(doc.orderDate, 7) AS OrderMonth,
    doc.region AS Region,
    COUNT(1) AS OrderCount,
    SUM(doc.totalAmount) AS TotalRevenue
FROM OPENROWSET(
    'CosmosDB',
    'Account=your-account;Database=sales;Region=westus2;Key=YOUR_KEY',
    orders
) WITH (
    orderDate VARCHAR(30),
    region VARCHAR(50),
    totalAmount FLOAT
) AS doc
GROUP BY LEFT(doc.orderDate, 7), doc.region;
```

### Monitor Analytical Query Cost

Queries against the transactional store consume Request Units (RUs). Synapse serverless SQL queries against the analytical store do not consume transactional RUs, but they are billed as analytical reads and Synapse serverless SQL data processing. Monitor the cost and latency of queries generated by Power BI:

1. Enable diagnostics logging for Cosmos DB if you also use the native connector or transactional queries.
2. Monitor Synapse serverless SQL query history and data processed for analytical queries.
3. Correlate expensive operations with Power BI report interactions and refresh times.

### Limit the Data Scope

Use Power BI query reduction options:

1. In Power BI Desktop > Options > Query reduction.
2. Enable "Add an Apply button to each slicer".
3. Enable "Add an Apply button to filter panes".
4. Enable "Disable cross highlighting by default".

These options prevent every slicer change from triggering immediate queries.

## Common Issues

**Timeout errors**: DirectQuery has a timeout (typically 4 minutes in the Power BI service). If source queries take longer, you get errors. Fix by reducing the data scope, adding filters, or using aggregated views.

**Missing data types**: Cosmos DB is schema-less, so data types can be inconsistent. A field might be a number in one document and a string in another. This causes errors in Power BI. Standardize your data or cast types in the query.

**Cross-partition transactional queries**: Queries against the transactional store that span multiple partitions are more expensive. If you use the native connector or transactional queries, design your partition key and filters so Power BI reads target specific partitions when possible.

## Wrapping Up

Using Power BI DirectQuery with Azure Cosmos DB data lets you build interactive reports over large NoSQL datasets without importing the data into Power BI. The native connector works for simple import scenarios, Synapse Link can support existing DirectQuery implementations through SQL views, and Fabric mirroring is the recommended path for new projects. The main challenges are handling nested documents, managing query performance, and working within DirectQuery's DAX limitations. Flatten your data at the view layer, limit the number of visuals per page, use pre-aggregated views for dashboards, and monitor analytical query costs to keep spending under control.
