# How to Build Demand Forecasting Features with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Demand Forecasting, Feature Store, Analytics, Time Series, Supply Chain

Description: Compute demand forecasting features in ClickHouse including moving averages, seasonality signals, and sell-through rates to feed ML forecasting models.

---

Demand forecasting models rely on historical sales features to predict future demand. ClickHouse is well-suited to compute these features at scale across thousands of SKU-location combinations.

## Sales History Table

```sql
CREATE TABLE daily_sales (
    sku          String,
    location_id  LowCardinality(String),
    channel      LowCardinality(String),
    units_sold   UInt32,
    revenue      Decimal64(2),
    sale_date    Date
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(sale_date)
ORDER BY (sku, location_id, sale_date);
```

## Rolling Demand Features

Compute 7-day, 14-day, and 28-day rolling averages - core forecasting signals:

```sql
SELECT
    sku,
    location_id,
    sale_date,
    units_sold,
    avg(units_sold) OVER (
        PARTITION BY sku, location_id
        ORDER BY sale_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7d_avg,
    avg(units_sold) OVER (
        PARTITION BY sku, location_id
        ORDER BY sale_date
        ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    ) AS rolling_14d_avg,
    avg(units_sold) OVER (
        PARTITION BY sku, location_id
        ORDER BY sale_date
        ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
    ) AS rolling_28d_avg
FROM daily_sales
WHERE sale_date >= today() - 60
ORDER BY sku, location_id, sale_date;
```

## Year-over-Year Growth

Measure YoY demand growth to capture trend signals:

```sql
SELECT
    sku,
    location_id,
    sumIf(units_sold, sale_date >= today() - 28) AS units_last_28d,
    sumIf(units_sold, sale_date BETWEEN today() - 393 AND today() - 365) AS units_prior_year_28d,
    round((units_last_28d - units_prior_year_28d) / nullIf(units_prior_year_28d, 0) * 100, 2) AS yoy_growth_pct
FROM daily_sales
WHERE sale_date >= today() - 393
GROUP BY sku, location_id;
```

## Day-of-Week Seasonality Index

Capture weekly seasonality patterns:

```sql
WITH dow_avg AS (
    SELECT
        sku,
        location_id,
        toDayOfWeek(sale_date) AS dow,
        avg(units_sold) AS avg_units_for_dow
    FROM daily_sales
    WHERE sale_date >= today() - 90
    GROUP BY sku, location_id, dow
)
SELECT
    sku,
    location_id,
    dow,
    avg_units_for_dow,
    avg(avg_units_for_dow) OVER (PARTITION BY sku, location_id) AS overall_avg,
    avg_units_for_dow / nullIf(avg(avg_units_for_dow) OVER (PARTITION BY sku, location_id), 0) AS seasonality_index
FROM dow_avg
ORDER BY sku, location_id, dow;
```

## Sell-Through Rate

For seasonal or fashion items, sell-through rate is critical:

```sql
SELECT
    s.sku,
    s.location_id,
    sum(s.units_sold) AS units_sold_30d,
    i.on_hand_qty AS current_stock,
    round(sum(s.units_sold) / nullIf(sum(s.units_sold) + i.on_hand_qty, 0) * 100, 2) AS sell_through_pct
FROM daily_sales s
JOIN (
    SELECT sku, location_id, sum(quantity) AS on_hand_qty
    FROM inventory_events
    GROUP BY sku, location_id
) i USING (sku, location_id)
WHERE s.sale_date >= today() - 30
GROUP BY s.sku, s.location_id, i.on_hand_qty
ORDER BY sell_through_pct DESC;
```

## Demand Volatility (Coefficient of Variation)

High volatility SKUs need wider safety stock buffers:

```sql
SELECT
    sku,
    location_id,
    avg(units_sold) AS avg_demand,
    stddevPop(units_sold) AS std_demand,
    round(stddevPop(units_sold) / nullIf(avg(units_sold), 0), 3) AS cv_demand
FROM daily_sales
WHERE sale_date >= today() - 90
GROUP BY sku, location_id
ORDER BY cv_demand DESC;
```

## Summary

ClickHouse enables high-performance computation of demand forecasting features at the SKU-location level - rolling averages, seasonality indices, YoY trends, and sell-through rates feed directly into forecasting models or replenishment engines. Fast aggregations across millions of rows keep feature pipelines efficient.
