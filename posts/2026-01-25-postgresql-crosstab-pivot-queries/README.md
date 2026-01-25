# How to Create Crosstab (Pivot Table) Queries in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQL, Crosstab, Pivot Tables, Data Analysis, tablefunc

Description: Learn how to transform row-based data into columnar format using PostgreSQL's crosstab function. This guide covers installation, basic syntax, dynamic pivoting, and practical examples for reporting.

---

Pivot tables are essential for data analysis and reporting. While spreadsheet applications make pivoting easy, doing the same in SQL requires a different approach. PostgreSQL provides the `crosstab` function through the `tablefunc` extension, allowing you to transform rows into columns directly in your database queries.

## Understanding Crosstab Basics

A crosstab query transforms data from a normalized row format into a denormalized columnar format. Consider sales data stored as individual rows for each product and month. A crosstab can pivot this into a table where each product is a row and each month becomes a column.

Before using crosstab, you need to enable the tablefunc extension.

```sql
-- Enable the tablefunc extension (requires superuser or create extension privilege)
-- This extension provides crosstab and other pivot-related functions
CREATE EXTENSION IF NOT EXISTS tablefunc;
```

## Setting Up Sample Data

Let's create a realistic dataset to work with. We will build a sales tracking table that stores monthly revenue by product.

```sql
-- Create a sales table to store monthly revenue data
CREATE TABLE monthly_sales (
    product_name VARCHAR(50),
    sale_month VARCHAR(20),
    revenue DECIMAL(10,2)
);

-- Insert sample data for three products across four months
INSERT INTO monthly_sales (product_name, sale_month, revenue) VALUES
    ('Widget A', 'January', 15000.00),
    ('Widget A', 'February', 18500.00),
    ('Widget A', 'March', 22000.00),
    ('Widget A', 'April', 19500.00),
    ('Widget B', 'January', 8000.00),
    ('Widget B', 'February', 9200.00),
    ('Widget B', 'March', 11000.00),
    ('Widget B', 'April', 10500.00),
    ('Widget C', 'January', 5500.00),
    ('Widget C', 'February', 6100.00),
    ('Widget C', 'March', 7200.00),
    ('Widget C', 'April', 6800.00);
```

## Basic Crosstab Query

The crosstab function takes a SQL query as input and produces pivoted output. The input query must return exactly three columns: row identifier, category, and value.

```sql
-- Basic crosstab: pivot monthly sales into columns
-- The inner query must return (row_id, category, value) in that order
SELECT * FROM crosstab(
    'SELECT product_name, sale_month, revenue
     FROM monthly_sales
     ORDER BY product_name, sale_month'
) AS pivot_table (
    product_name VARCHAR(50),
    january DECIMAL(10,2),
    february DECIMAL(10,2),
    march DECIMAL(10,2),
    april DECIMAL(10,2)
);
```

This query produces output like:

```
product_name | january  | february | march    | april
-------------+----------+----------+----------+---------
Widget A     | 15000.00 | 18500.00 | 22000.00 | 19500.00
Widget B     |  8000.00 |  9200.00 | 11000.00 | 10500.00
Widget C     |  5500.00 |  6100.00 |  7200.00 |  6800.00
```

## Handling Missing Values

One limitation of the basic crosstab is that it assigns values positionally. If a product is missing data for a particular month, the values shift incorrectly. The two-parameter crosstab solves this problem.

```sql
-- Two-parameter crosstab handles missing values correctly
-- Second parameter defines the complete list of categories
SELECT * FROM crosstab(
    'SELECT product_name, sale_month, revenue
     FROM monthly_sales
     ORDER BY product_name, sale_month',
    'SELECT DISTINCT sale_month FROM monthly_sales ORDER BY sale_month'
) AS pivot_table (
    product_name VARCHAR(50),
    april DECIMAL(10,2),
    february DECIMAL(10,2),
    january DECIMAL(10,2),
    march DECIMAL(10,2)
);
```

The second query parameter explicitly lists all possible category values. This ensures that NULL appears in the correct column when data is missing, rather than shifting values left.

## Crosstab with Aggregation

Often you need to aggregate data before pivoting. Combine GROUP BY with crosstab for summarized reports.

```sql
-- Create a more detailed sales table with individual transactions
CREATE TABLE sales_transactions (
    transaction_id SERIAL PRIMARY KEY,
    product_name VARCHAR(50),
    sale_date DATE,
    quantity INTEGER,
    unit_price DECIMAL(10,2)
);

-- Pivot aggregated quarterly data
SELECT * FROM crosstab(
    'SELECT
        product_name,
        EXTRACT(QUARTER FROM sale_date)::TEXT as quarter,
        SUM(quantity * unit_price) as total_revenue
     FROM sales_transactions
     WHERE sale_date >= ''2026-01-01''
     GROUP BY product_name, EXTRACT(QUARTER FROM sale_date)
     ORDER BY product_name, quarter',
    'SELECT generate_series(1,4)::TEXT'
) AS quarterly_report (
    product_name VARCHAR(50),
    q1_revenue DECIMAL(10,2),
    q2_revenue DECIMAL(10,2),
    q3_revenue DECIMAL(10,2),
    q4_revenue DECIMAL(10,2)
);
```

## Dynamic Crosstab with PL/pgSQL

The standard crosstab requires you to know column names in advance. For truly dynamic pivoting, you can use PL/pgSQL to generate and execute queries.

```sql
-- Function to generate dynamic crosstab SQL
CREATE OR REPLACE FUNCTION dynamic_pivot(
    source_table TEXT,
    row_field TEXT,
    pivot_field TEXT,
    value_field TEXT
) RETURNS TEXT AS $$
DECLARE
    pivot_columns TEXT;
    final_query TEXT;
BEGIN
    -- Build the column list dynamically from distinct pivot values
    EXECUTE format(
        'SELECT string_agg(DISTINCT quote_ident(%I)::TEXT, '', '' ORDER BY quote_ident(%I)::TEXT)
         FROM %I',
        pivot_field, pivot_field, source_table
    ) INTO pivot_columns;

    -- Construct the crosstab query
    final_query := format(
        'SELECT * FROM crosstab(
            ''SELECT %I, %I, %I FROM %I ORDER BY 1, 2'',
            ''SELECT DISTINCT %I FROM %I ORDER BY 1''
        ) AS ct (%I TEXT, %s)',
        row_field, pivot_field, value_field, source_table,
        pivot_field, source_table,
        row_field, pivot_columns
    );

    RETURN final_query;
END;
$$ LANGUAGE plpgsql;

-- Use the function to get the query, then execute it
SELECT dynamic_pivot('monthly_sales', 'product_name', 'sale_month', 'revenue');
```

## Alternative: FILTER Clause for Simple Pivots

For cases where you know the categories in advance and want simpler syntax, the FILTER clause provides an alternative to crosstab.

```sql
-- Pivot using FILTER clause (no extension required)
-- Each column uses a conditional aggregate
SELECT
    product_name,
    SUM(revenue) FILTER (WHERE sale_month = 'January') AS january,
    SUM(revenue) FILTER (WHERE sale_month = 'February') AS february,
    SUM(revenue) FILTER (WHERE sale_month = 'March') AS march,
    SUM(revenue) FILTER (WHERE sale_month = 'April') AS april
FROM monthly_sales
GROUP BY product_name
ORDER BY product_name;
```

This approach is often easier to read and does not require the tablefunc extension. However, it becomes unwieldy when you have many pivot columns.

## Crosstab with Multiple Value Columns

Sometimes you need to pivot multiple values simultaneously. Use nested crosstabs or combine with CASE expressions.

```sql
-- Pivot both revenue and quantity using CASE expressions
SELECT
    product_name,
    SUM(CASE WHEN sale_month = 'January' THEN revenue END) AS jan_revenue,
    SUM(CASE WHEN sale_month = 'January' THEN quantity END) AS jan_qty,
    SUM(CASE WHEN sale_month = 'February' THEN revenue END) AS feb_revenue,
    SUM(CASE WHEN sale_month = 'February' THEN quantity END) AS feb_qty
FROM sales_with_quantity
GROUP BY product_name;
```

## Performance Considerations

Crosstab queries can be resource-intensive on large datasets. Consider these optimizations:

```sql
-- Create an index on the grouping columns for faster crosstab queries
CREATE INDEX idx_sales_pivot ON monthly_sales (product_name, sale_month);

-- For very large tables, materialize the aggregated data first
CREATE MATERIALIZED VIEW sales_summary AS
SELECT product_name, sale_month, SUM(revenue) as total_revenue
FROM sales_transactions
GROUP BY product_name, sale_month;

-- Then pivot the materialized view
SELECT * FROM crosstab(
    'SELECT product_name, sale_month, total_revenue
     FROM sales_summary
     ORDER BY 1, 2'
) AS ct (product_name VARCHAR, jan DECIMAL, feb DECIMAL, mar DECIMAL);

-- Refresh the materialized view periodically
REFRESH MATERIALIZED VIEW sales_summary;
```

## Common Pitfalls and Solutions

The most frequent issues with crosstab involve column ordering and type mismatches. Always ensure your source query returns data in the correct order, and that your output column definitions match the actual data types.

```sql
-- Common mistake: forgetting ORDER BY in the source query
-- This can cause values to appear in wrong columns

-- Correct approach: always order by row identifier then category
SELECT * FROM crosstab(
    'SELECT product_name, sale_month, revenue
     FROM monthly_sales
     ORDER BY product_name, sale_month'  -- ORDER BY is essential
) AS ct (product VARCHAR, m1 DECIMAL, m2 DECIMAL, m3 DECIMAL, m4 DECIMAL);
```

Crosstab queries transform how you can present data directly from PostgreSQL. Whether you use the tablefunc extension or the FILTER clause approach, pivoting data in the database reduces the processing burden on your application layer and simplifies report generation.
