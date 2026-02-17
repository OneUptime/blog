# How to Connect Power BI to Azure Synapse Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Synapse Analytics, Power BI, Data Visualization, Business Intelligence, Analytics, Reporting

Description: Learn how to connect Power BI to Azure Synapse Analytics dedicated and serverless SQL pools for interactive data visualization and reporting.

---

Power BI and Azure Synapse Analytics form a natural pair. Synapse handles the heavy lifting of storing, processing, and querying your data at scale. Power BI turns those query results into dashboards, reports, and visualizations that business users actually look at. Connecting the two is straightforward, but there are important choices to make about connection modes and query patterns that affect both performance and cost.

## Connection Options

There are three main ways to connect Power BI to Azure Synapse:

1. **DirectQuery**: Power BI sends queries to Synapse in real-time when users interact with reports. No data is imported into Power BI.
2. **Import**: Power BI loads data from Synapse into its own in-memory engine. Queries run locally in Power BI.
3. **Composite model**: A mix of DirectQuery and Import. Some tables are imported, others use DirectQuery.

Each has different tradeoffs:

| Aspect | DirectQuery | Import | Composite |
|--------|-----------|--------|-----------|
| Data freshness | Real-time | Scheduled refresh | Mixed |
| Report performance | Depends on Synapse | Fast (in-memory) | Mixed |
| Data volume limit | No limit | ~1 GB per dataset (shared) | Mixed |
| Synapse cost | Higher (constant queries) | Lower (batch refreshes) | Mixed |
| Offline access | No | Yes | Partial |

For most enterprise scenarios, DirectQuery to a dedicated SQL pool gives the best balance of freshness and performance. For exploratory work over a data lake, Import mode with a serverless SQL pool query works well.

## Prerequisites

- Azure Synapse workspace with a dedicated SQL pool and/or serverless SQL pool
- Power BI Desktop installed (latest version recommended)
- Power BI Pro or Premium license for sharing reports
- Network connectivity between Power BI and Synapse (firewall rules configured)

## Method 1: Connect Power BI Desktop to Dedicated SQL Pool

### Step 1: Get the Connection Details

Find your dedicated SQL pool endpoint:

```bash
# Get the Synapse workspace SQL endpoint
az synapse workspace show \
  --name my-synapse-workspace \
  --resource-group rg-synapse \
  --query "connectivityEndpoints.sql" -o tsv
```

The endpoint follows the pattern: `my-synapse-workspace.sql.azuresynapse.net`

### Step 2: Connect from Power BI Desktop

1. Open Power BI Desktop.
2. Click "Get Data" > "Azure" > "Azure Synapse Analytics SQL".
3. Enter the server: `my-synapse-workspace.sql.azuresynapse.net`
4. Enter the database: `myDataWarehouse` (your dedicated SQL pool name)
5. Choose the data connectivity mode:
   - **DirectQuery**: For real-time queries against the pool
   - **Import**: To load data into Power BI's memory
6. Choose authentication:
   - **Microsoft account**: Uses your Azure AD credentials
   - **Database**: Uses the SQL admin credentials
7. Click "Connect".

### Step 3: Select Tables or Write a Custom Query

After connecting, Power BI shows the tables in your dedicated SQL pool. You can either:

- Select tables directly from the navigator
- Write a custom SQL query for more control

For a custom query, click "Advanced options" before connecting and enter your SQL:

```sql
-- Custom query for Power BI - a pre-aggregated summary
-- This reduces the data volume Power BI needs to handle
SELECT
    d.Country,
    d.City,
    p.ProductCategory,
    p.Brand,
    CAST(f.OrderDate AS DATE) AS OrderDate,
    SUM(f.TotalAmount) AS Revenue,
    COUNT(*) AS OrderCount,
    AVG(f.TotalAmount) AS AvgOrderValue
FROM dbo.FactSales f
JOIN dbo.DimCustomer d ON f.CustomerId = d.CustomerId
JOIN dbo.DimProduct p ON f.ProductId = p.ProductId
GROUP BY d.Country, d.City, p.ProductCategory, p.Brand, f.OrderDate
```

Using pre-aggregated queries in Power BI significantly improves report performance, especially with DirectQuery.

## Method 2: Connect Power BI to Serverless SQL Pool

Serverless SQL pool is useful when you want to visualize data that lives in the data lake without loading it into a dedicated pool.

### Step 1: Create Views in Serverless Pool

Create views that Power BI will query. This gives you a clean interface without exposing file paths.

```sql
-- Connect to the serverless SQL endpoint and create views
-- Serverless endpoint: my-synapse-workspace-ondemand.sql.azuresynapse.net

USE SalesAnalytics; -- Your serverless database
GO

-- Create a view over Parquet files in the data lake
CREATE OR ALTER VIEW dbo.vw_MonthlySales AS
SELECT
    YEAR(OrderDate) AS SalesYear,
    MONTH(OrderDate) AS SalesMonth,
    ProductCategory,
    Country,
    SUM(TotalAmount) AS Revenue,
    COUNT(*) AS OrderCount
FROM OPENROWSET(
    BULK 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/curated/sales/**/*.parquet',
    FORMAT = 'PARQUET'
) AS sales
JOIN OPENROWSET(
    BULK 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/dimensions/customers.parquet',
    FORMAT = 'PARQUET'
) AS customers ON sales.CustomerId = customers.CustomerId
GROUP BY YEAR(OrderDate), MONTH(OrderDate), ProductCategory, Country;
```

### Step 2: Connect Power BI to the Serverless Endpoint

1. In Power BI Desktop, click "Get Data" > "Azure Synapse Analytics SQL".
2. Server: `my-synapse-workspace-ondemand.sql.azuresynapse.net` (note the `-ondemand` suffix)
3. Database: `SalesAnalytics`
4. Use **Import** mode (recommended for serverless to avoid per-query costs)
5. Select the views you created.

**Important cost note**: Using DirectQuery against serverless SQL pool means every user interaction in Power BI generates a query, and each query is billed based on data processed. This can get expensive quickly. Import mode is almost always the better choice for serverless - load the data once during a scheduled refresh and let users query the in-memory model.

## Method 3: Power BI Service Integration (Linked Service)

For a tighter integration, link your Power BI workspace directly to the Synapse workspace.

1. In Synapse Studio, go to Manage > Linked services.
2. Click "New" and select "Power BI".
3. Select your Power BI workspace.
4. This allows you to browse and edit Power BI datasets directly from Synapse Studio.

With this integration, you can also push data from Synapse pipelines directly into Power BI datasets using the Power BI refresh API.

## Optimizing DirectQuery Performance

DirectQuery performance depends entirely on how fast Synapse can execute the queries Power BI generates. Here are strategies to keep reports snappy:

**1. Use materialized views in dedicated SQL pool:**

```sql
-- Create a materialized view for common Power BI queries
CREATE MATERIALIZED VIEW dbo.mvw_SalesSummary
WITH (DISTRIBUTION = HASH(ProductCategory))
AS
SELECT
    ProductCategory,
    Brand,
    Country,
    CAST(OrderDate AS DATE) AS OrderDate,
    SUM(TotalAmount) AS Revenue,
    COUNT_BIG(*) AS OrderCount
FROM dbo.FactSales f
JOIN dbo.DimProduct p ON f.ProductId = p.ProductId
JOIN dbo.DimCustomer c ON f.CustomerId = c.CustomerId
GROUP BY ProductCategory, Brand, Country, OrderDate;
```

Synapse automatically uses materialized views when they satisfy a query, even if the query references the base tables.

**2. Enable result set caching:**

```sql
-- Enable result set caching at the database level
ALTER DATABASE myDataWarehouse
SET RESULT_SET_CACHING ON;
```

Repeated identical queries (common with Power BI dashboards) will be served from cache.

**3. Reduce visual complexity**: Each visual on a Power BI report page generates at least one query. A dashboard with 20 visuals means 20 concurrent queries. Keep it to 8-12 visuals per page.

**4. Use aggregations in Power BI**: Define aggregation tables in your Power BI model. High-level visuals query the aggregation table; drill-down visuals query the detail table.

## Setting Up Scheduled Refresh (Import Mode)

If you chose Import mode, configure scheduled refresh so your data stays current.

1. Publish the report to Power BI Service.
2. Go to the dataset settings in Power BI Service.
3. Under "Scheduled refresh", configure:
   - Refresh frequency: Daily, or multiple times per day
   - Time: Choose off-peak hours for your Synapse pool
   - Data source credentials: Configure the connection credentials

For a dedicated SQL pool, make sure the pool is running during refresh times. If you use the pause/resume feature, schedule the pool to resume before the Power BI refresh and pause after.

## Troubleshooting Common Issues

**"The server was not found"**: Check the Synapse firewall rules. The Power BI service IP ranges must be allowed. Enable "Allow Azure services" in the firewall settings.

**"Login failed for user"**: Verify credentials. For Azure AD auth, ensure the user has access to the specific SQL pool database.

**Slow DirectQuery reports**: Check the Synapse server load. If the dedicated pool is at a low DWU level, queries might be slow. Also check if there are competing queries from other users or ETL jobs.

**High serverless costs**: Switch from DirectQuery to Import mode for serverless SQL pool connections. Set up scheduled refresh instead.

## Wrapping Up

Connecting Power BI to Azure Synapse Analytics is simple at a technical level - it is just a SQL connection. But the choices you make about connection mode (DirectQuery vs. Import), query design (pre-aggregated vs. raw tables), and optimization (materialized views, result caching) determine whether your reports are fast and cost-effective or slow and expensive. For dedicated SQL pools, DirectQuery with materialized views works well. For serverless SQL pools, Import mode with scheduled refresh is the safer choice to control costs.
