# How to Build a Supply Chain Analytics Dashboard with Supply Chain Twin and Looker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Supply Chain Twin, Looker, Analytics, Dashboard, BigQuery

Description: Build a comprehensive supply chain analytics dashboard using Google Cloud Supply Chain Twin data and Looker for visualization and business intelligence.

---

Having supply chain data in a digital twin is only useful if people can actually see and act on it. A well-built analytics dashboard turns raw supply chain data into actionable insights - showing inventory health, shipment status, supplier performance, and demand trends at a glance. Google Cloud's Looker connects directly to the BigQuery datasets that Supply Chain Twin populates, making it straightforward to build interactive dashboards.

This guide covers designing the data model, building the Looker views, and creating dashboards that supply chain teams actually use.

## Data Foundation in BigQuery

Supply Chain Twin stores its data in BigQuery. Before building dashboards, ensure your tables are structured for efficient querying.

```sql
-- Create a materialized view for current inventory status
-- This pre-aggregates inventory data for fast dashboard queries
CREATE MATERIALIZED VIEW `project.supply_chain.mv_current_inventory`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 15
)
AS
SELECT
  w.warehouse_id,
  w.warehouse_name,
  w.region,
  w.country,
  p.product_id,
  p.product_name,
  p.category,
  i.current_quantity,
  p.safety_stock_level,
  p.reorder_point,
  CASE
    WHEN i.current_quantity <= 0 THEN 'Out of Stock'
    WHEN i.current_quantity < p.safety_stock_level THEN 'Below Safety Stock'
    WHEN i.current_quantity < p.reorder_point THEN 'Below Reorder Point'
    ELSE 'Healthy'
  END AS stock_status,
  i.last_updated
FROM `project.supply_chain.inventory_levels` i
JOIN `project.supply_chain.warehouses` w ON i.warehouse_id = w.warehouse_id
JOIN `project.supply_chain.products` p ON i.product_id = p.product_id;
```

Create additional views for shipment analytics.

```sql
-- Shipment performance summary
CREATE MATERIALIZED VIEW `project.supply_chain.mv_shipment_performance`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 30
)
AS
SELECT
  s.carrier,
  s.transport_mode,
  s.origin_region,
  s.destination_region,
  DATE(s.ship_date) AS ship_date,
  COUNT(*) AS total_shipments,
  COUNTIF(s.actual_delivery <= s.original_eta) AS on_time_deliveries,
  COUNTIF(s.actual_delivery > s.original_eta) AS late_deliveries,
  AVG(TIMESTAMP_DIFF(s.actual_delivery, s.ship_date, HOUR)) AS avg_transit_hours,
  AVG(TIMESTAMP_DIFF(s.actual_delivery, s.original_eta, HOUR)) AS avg_delay_hours
FROM `project.supply_chain.shipments` s
WHERE s.status = 'delivered'
GROUP BY s.carrier, s.transport_mode, s.origin_region, s.destination_region, DATE(s.ship_date);
```

## Setting Up the LookML Project

LookML is Looker's modeling language. It defines how BigQuery tables map to dimensions and measures that dashboard users can explore.

```lookml
# views/inventory.view.lkml
# Defines the inventory data model for Looker
view: inventory {
  sql_table_name: `project.supply_chain.mv_current_inventory` ;;

  dimension: warehouse_id {
    type: string
    sql: ${TABLE}.warehouse_id ;;
  }

  dimension: warehouse_name {
    type: string
    sql: ${TABLE}.warehouse_name ;;
  }

  dimension: region {
    type: string
    sql: ${TABLE}.region ;;
  }

  dimension: product_id {
    type: string
    sql: ${TABLE}.product_id ;;
  }

  dimension: product_name {
    type: string
    sql: ${TABLE}.product_name ;;
  }

  dimension: category {
    type: string
    sql: ${TABLE}.category ;;
  }

  dimension: current_quantity {
    type: number
    sql: ${TABLE}.current_quantity ;;
  }

  dimension: safety_stock_level {
    type: number
    sql: ${TABLE}.safety_stock_level ;;
  }

  dimension: stock_status {
    type: string
    sql: ${TABLE}.stock_status ;;
    # Color code the status for visual clarity
    html:
      {% if value == 'Out of Stock' %}
        <span style="color: red; font-weight: bold;">{{ value }}</span>
      {% elsif value == 'Below Safety Stock' %}
        <span style="color: orange; font-weight: bold;">{{ value }}</span>
      {% elsif value == 'Below Reorder Point' %}
        <span style="color: #DAA520;">{{ value }}</span>
      {% else %}
        <span style="color: green;">{{ value }}</span>
      {% endif %} ;;
  }

  # Measures for aggregation
  measure: total_quantity {
    type: sum
    sql: ${current_quantity} ;;
  }

  measure: product_count {
    type: count_distinct
    sql: ${product_id} ;;
  }

  measure: out_of_stock_products {
    type: count_distinct
    sql: ${product_id} ;;
    filters: [stock_status: "Out of Stock"]
  }

  measure: below_safety_stock_products {
    type: count_distinct
    sql: ${product_id} ;;
    filters: [stock_status: "Below Safety Stock"]
  }

  measure: inventory_health_rate {
    type: number
    sql: 1.0 * ${out_of_stock_products} / NULLIF(${product_count}, 0) ;;
    value_format_name: percent_1
    label: "Out of Stock Rate"
  }
}
```

Create a view for shipment performance.

```lookml
# views/shipments.view.lkml
view: shipment_performance {
  sql_table_name: `project.supply_chain.mv_shipment_performance` ;;

  dimension: carrier {
    type: string
    sql: ${TABLE}.carrier ;;
  }

  dimension: transport_mode {
    type: string
    sql: ${TABLE}.transport_mode ;;
  }

  dimension: origin_region {
    type: string
    sql: ${TABLE}.origin_region ;;
  }

  dimension: destination_region {
    type: string
    sql: ${TABLE}.destination_region ;;
  }

  dimension_group: ship {
    type: time
    timeframes: [date, week, month, quarter, year]
    sql: ${TABLE}.ship_date ;;
  }

  measure: total_shipments {
    type: sum
    sql: ${TABLE}.total_shipments ;;
  }

  measure: on_time_deliveries {
    type: sum
    sql: ${TABLE}.on_time_deliveries ;;
  }

  measure: on_time_rate {
    type: number
    sql: 1.0 * ${on_time_deliveries} / NULLIF(${total_shipments}, 0) ;;
    value_format_name: percent_1
    label: "On-Time Delivery Rate"
  }

  measure: avg_transit_hours {
    type: average
    sql: ${TABLE}.avg_transit_hours ;;
    value_format: "0.0"
    label: "Avg Transit Time (hours)"
  }

  measure: avg_delay_hours {
    type: average
    sql: ${TABLE}.avg_delay_hours ;;
    value_format: "0.0"
    label: "Avg Delay (hours)"
  }
}
```

## Building the Model

Connect the views together in a LookML model.

```lookml
# models/supply_chain.model.lkml
connection: "bigquery_production"

include: "/views/*.view.lkml"

explore: inventory {
  label: "Inventory Analysis"
  description: "Current inventory levels across all warehouses"

  always_filter: {
    filters: [inventory.stock_status: "-NULL"]
  }
}

explore: shipment_performance {
  label: "Shipment Performance"
  description: "Shipping and delivery performance metrics"
}
```

## Dashboard: Executive Supply Chain Overview

Create the main dashboard that supply chain leaders check daily.

```lookml
# dashboards/supply_chain_overview.dashboard.lookml
- dashboard: supply_chain_overview
  title: "Supply Chain Overview"
  layout: newspaper
  preferred_viewer: dashboards-next

  filters:
    - name: Region
      title: "Region"
      type: field_filter
      default_value: ""
      explore: inventory
      field: inventory.region
    - name: Date Range
      title: "Date Range"
      type: date_filter
      default_value: "30 days"

  elements:
    # KPI tiles across the top
    - title: "Total SKUs"
      type: single_value
      model: supply_chain
      explore: inventory
      measures: [inventory.product_count]
      row: 0
      col: 0
      width: 4
      height: 3

    - title: "Out of Stock SKUs"
      type: single_value
      model: supply_chain
      explore: inventory
      measures: [inventory.out_of_stock_products]
      row: 0
      col: 4
      width: 4
      height: 3

    - title: "On-Time Delivery Rate"
      type: single_value
      model: supply_chain
      explore: shipment_performance
      measures: [shipment_performance.on_time_rate]
      row: 0
      col: 8
      width: 4
      height: 3

    # Inventory status breakdown
    - title: "Inventory Health by Region"
      type: looker_bar
      model: supply_chain
      explore: inventory
      dimensions: [inventory.region, inventory.stock_status]
      measures: [inventory.product_count]
      pivots: [inventory.stock_status]
      row: 3
      col: 0
      width: 12
      height: 6

    # Shipment performance trend
    - title: "On-Time Delivery Trend"
      type: looker_line
      model: supply_chain
      explore: shipment_performance
      dimensions: [shipment_performance.ship_week]
      measures: [shipment_performance.on_time_rate]
      row: 9
      col: 0
      width: 12
      height: 6
```

## Custom SQL for Advanced Metrics

Some supply chain metrics require more complex SQL. Use derived tables in LookML.

```lookml
# views/demand_forecast.view.lkml
view: demand_vs_actual {
  derived_table: {
    sql:
      SELECT
        p.product_id,
        p.product_name,
        p.category,
        DATE_TRUNC(d.date, WEEK) AS week,
        SUM(d.forecasted_demand) AS forecasted_demand,
        SUM(a.actual_sales) AS actual_sales,
        SAFE_DIVIDE(
          ABS(SUM(d.forecasted_demand) - SUM(a.actual_sales)),
          SUM(d.forecasted_demand)
        ) AS forecast_error_rate
      FROM `project.supply_chain.demand_forecast` d
      JOIN `project.supply_chain.actual_sales` a
        ON d.product_id = a.product_id AND d.date = a.date
      JOIN `project.supply_chain.products` p
        ON d.product_id = p.product_id
      GROUP BY p.product_id, p.product_name, p.category, DATE_TRUNC(d.date, WEEK)
    ;;
    datagroup_trigger: daily_refresh
  }

  dimension: product_name {
    type: string
    sql: ${TABLE}.product_name ;;
  }

  dimension_group: week {
    type: time
    timeframes: [week, month]
    sql: ${TABLE}.week ;;
  }

  measure: total_forecasted {
    type: sum
    sql: ${TABLE}.forecasted_demand ;;
  }

  measure: total_actual {
    type: sum
    sql: ${TABLE}.actual_sales ;;
  }

  measure: avg_forecast_error {
    type: average
    sql: ${TABLE}.forecast_error_rate ;;
    value_format_name: percent_1
    label: "Forecast Accuracy Error Rate"
  }
}
```

## Scheduled Reports

Set up scheduled email reports for stakeholders who do not check dashboards daily.

In Looker, navigate to the dashboard and use the schedule delivery feature. You can send daily or weekly PDF or CSV reports to distribution lists. For programmatic scheduling, use the Looker API.

```python
# schedule_report.py - Programmatically schedule a Looker report
import looker_sdk

sdk = looker_sdk.init40()

# Create a scheduled plan for the supply chain overview dashboard
schedule = sdk.create_scheduled_plan(
    body=looker_sdk.models40.WriteScheduledPlan(
        name="Daily Supply Chain Overview",
        dashboard_id=123,  # Your dashboard ID
        crontab="0 7 * * 1-5",  # Weekdays at 7 AM
        scheduled_plan_destination=[
            looker_sdk.models40.ScheduledPlanDestination(
                format="wysiwyg_pdf",
                type="email",
                address="supply-chain-team@company.com",
            )
        ],
        run_as_recipient=False,
    )
)

print(f"Scheduled report created: {schedule.id}")
```

## Wrapping Up

A supply chain analytics dashboard built on Supply Chain Twin and Looker gives your team real-time visibility into the metrics that matter - inventory health, delivery performance, and demand accuracy. The materialized views in BigQuery keep query performance fast, LookML provides a maintainable semantic layer, and Looker handles the visualization and distribution. The key to a useful dashboard is focusing on the metrics that drive decisions rather than trying to show everything at once. Start with the executive overview, then build deeper drill-down views as your team identifies what they need.
