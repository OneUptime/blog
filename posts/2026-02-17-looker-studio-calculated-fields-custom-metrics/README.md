# How to Create Calculated Fields and Custom Metrics in Looker Studio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Looker Studio, Calculated Fields, Custom Metrics, Data Visualization, BigQuery

Description: A practical guide to creating calculated fields and custom metrics in Looker Studio to derive business insights beyond raw data columns.

---

Raw data columns rarely tell the full story. You need ratios, conditional aggregations, running totals, and derived categories to build dashboards that actually answer business questions. Looker Studio's calculated fields let you create these derived metrics right in the reporting layer, without modifying your BigQuery tables or views.

This guide walks through the most useful calculated field patterns I have used in production dashboards, from simple arithmetic to complex conditional logic.

## Creating Your First Calculated Field

In Looker Studio, you can create calculated fields at two levels:

**Data source level** - Available across all reports that use this data source. Created in the data source editor.

**Chart level** - Available only within a specific chart. Created in the chart's field settings.

To create a data source level field:

1. Edit your report
2. Click on "Resource" in the menu, then "Manage added data sources"
3. Click "Edit" on your data source
4. Click "Add a field" at the bottom left

To create a chart level field:

1. Select a chart
2. In the data panel on the right, click "Add metric" or "Add dimension"
3. Click "Create field"

Chart-level fields are faster to create but less reusable. For fields you will use across multiple charts, create them at the data source level.

## Arithmetic Calculations

The most common calculated fields involve basic math on existing metrics.

**Conversion rate:**

```
total_orders / unique_visitors
```

Name this field "Conversion Rate" and set the output type to Percent.

**Average revenue per user (ARPU):**

```
revenue / unique_customers
```

**Profit margin:**

```
(revenue - cost_of_goods) / revenue
```

**Year-over-year growth:**

```
(current_period_revenue - previous_period_revenue) / previous_period_revenue
```

## CASE Statements for Conditional Logic

CASE statements are incredibly useful for creating categories and conditional metrics.

**Customer segment based on order value:**

```
CASE
  WHEN avg_order_value >= 500 THEN "Premium"
  WHEN avg_order_value >= 100 THEN "Standard"
  WHEN avg_order_value >= 25 THEN "Budget"
  ELSE "Micro"
END
```

Name this "Customer Segment" and use it as a dimension in charts.

**Traffic source grouping:**

```
CASE
  WHEN REGEXP_MATCH(utm_source, "google|bing|yahoo") THEN "Search"
  WHEN REGEXP_MATCH(utm_source, "facebook|instagram|twitter|linkedin") THEN "Social"
  WHEN REGEXP_MATCH(utm_source, "email|newsletter") THEN "Email"
  WHEN utm_source IS NULL THEN "Direct"
  ELSE "Other"
END
```

**Status color indicator:**

```
CASE
  WHEN error_rate > 0.05 THEN "Red"
  WHEN error_rate > 0.01 THEN "Yellow"
  ELSE "Green"
END
```

You can use this as a conditional formatting dimension by mapping each value to a color in the chart style settings.

## Date Functions

Date calculations are essential for time-based analysis.

**Day of week:**

```
WEEKDAY(order_date)
```

This returns 0 (Sunday) through 6 (Saturday). For human-readable names:

```
CASE WEEKDAY(order_date)
  WHEN 0 THEN "Sunday"
  WHEN 1 THEN "Monday"
  WHEN 2 THEN "Tuesday"
  WHEN 3 THEN "Wednesday"
  WHEN 4 THEN "Thursday"
  WHEN 5 THEN "Friday"
  WHEN 6 THEN "Saturday"
END
```

**Days since last order:**

```
DATE_DIFF(CURRENT_DATE(), last_order_date)
```

**Fiscal quarter (for companies with non-calendar fiscal years starting in April):**

```
CASE
  WHEN MONTH(order_date) >= 4 AND MONTH(order_date) <= 6 THEN "Q1"
  WHEN MONTH(order_date) >= 7 AND MONTH(order_date) <= 9 THEN "Q2"
  WHEN MONTH(order_date) >= 10 AND MONTH(order_date) <= 12 THEN "Q3"
  ELSE "Q4"
END
```

**Year-month string for chart labels:**

```
CONCAT(CAST(YEAR(order_date) AS TEXT), "-", LPAD(CAST(MONTH(order_date) AS TEXT), 2, "0"))
```

## Text Manipulation

Clean up and transform text fields for better reporting.

**Extract domain from email:**

```
REGEXP_EXTRACT(email, "@(.+)")
```

**Capitalize first letter:**

```
CONCAT(UPPER(LEFT(city, 1)), LOWER(SUBSTR(city, 2)))
```

**Combine fields for display:**

```
CONCAT(first_name, " ", last_name, " (", customer_id, ")")
```

**Clean up product names:**

```
TRIM(REGEXP_REPLACE(product_name, "  +", " "))
```

## Aggregation-Based Metrics

Some calculated fields use aggregation functions. These are particularly useful for creating metrics that are not simple sums.

**Count of distinct values (useful as a metric):**

```
COUNT_DISTINCT(customer_id)
```

**Percentage of total:**

```
SUM(revenue) / SUM(revenue, "grand_total")
```

Wait - Looker Studio does not natively support percentage of total in calculated fields. Instead, use the "Percentage of total" comparison calculation in the chart settings. Select your metric, click the function icon, and choose "Percent of total."

**Running total (cumulative sum):**

This is also not available as a calculated field. Use the "Running sum" comparison calculation in chart settings for time series charts.

## Conditional Aggregations

Combine CASE statements with aggregations for powerful filtered metrics.

**Revenue from new customers only:**

```
SUM(
  CASE
    WHEN customer_type = "new" THEN order_total
    ELSE 0
  END
)
```

**Count of high-value orders:**

```
SUM(
  CASE
    WHEN order_total > 100 THEN 1
    ELSE 0
  END
)
```

**Error rate as a percentage:**

```
SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) / COUNT(request_id)
```

## Regex-Based Fields

Regular expressions are powerful for extracting patterns from text fields.

**Extract version number from user agent:**

```
REGEXP_EXTRACT(user_agent, "Chrome/(\\d+)")
```

**Classify URL paths into page categories:**

```
CASE
  WHEN REGEXP_MATCH(page_path, "^/product/") THEN "Product Pages"
  WHEN REGEXP_MATCH(page_path, "^/blog/") THEN "Blog"
  WHEN REGEXP_MATCH(page_path, "^/checkout") THEN "Checkout"
  WHEN page_path = "/" THEN "Homepage"
  ELSE "Other"
END
```

**Check if email is from a business domain:**

```
CASE
  WHEN REGEXP_MATCH(email, "@(gmail|yahoo|hotmail|outlook)\\.com$") THEN "Personal"
  ELSE "Business"
END
```

## Nested Calculations

You can reference one calculated field from another, but be careful about evaluation order.

First, create a "Customer Tier" field:

```
CASE
  WHEN lifetime_revenue >= 10000 THEN "Enterprise"
  WHEN lifetime_revenue >= 1000 THEN "Mid-Market"
  ELSE "SMB"
END
```

Then use it in another calculated field:

```
CASE
  WHEN Customer Tier = "Enterprise" THEN 0.15
  WHEN Customer Tier = "Mid-Market" THEN 0.10
  ELSE 0.05
END
```

Name this "Discount Rate" and use it in pricing calculations.

## Performance Tips

Calculated fields in Looker Studio run in the reporting layer, not in BigQuery. This means:

**Complex calculations on large datasets are slow.** If you find a calculated field making your dashboard sluggish, move the calculation to a BigQuery view instead.

**Pre-calculate in BigQuery when possible.** If a calculated field uses heavy regex or complex CASE logic on millions of rows, create it as a column in a BigQuery view:

```sql
-- Move complex calculations to BigQuery for better performance
CREATE OR REPLACE VIEW `my-project.reporting.enriched_orders` AS
SELECT
  *,
  CASE
    WHEN total_amount >= 500 THEN 'Premium'
    WHEN total_amount >= 100 THEN 'Standard'
    ELSE 'Budget'
  END AS order_tier,
  DATE_DIFF(CURRENT_DATE(), first_order_date, DAY) AS customer_age_days
FROM `my-project.analytics.orders`;
```

**Use calculated fields for presentation logic.** Things like formatting, display labels, and simple ratios work well in Looker Studio. Heavy data transformation should stay in BigQuery.

## Wrapping Up

Calculated fields are what turn a basic data display into an insightful dashboard. Start with simple arithmetic ratios, add CASE statements for business logic, and use regex for text extraction. When performance suffers, push the heavy calculations back to BigQuery. The goal is to let business users create their own metrics without needing SQL access, and a well-designed set of calculated fields enables exactly that.
