# How to Monitor Inventory Levels Across Warehouses Using Supply Chain Twin and BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Supply Chain Twin, BigQuery, Inventory Management, Monitoring

Description: Monitor inventory levels across multiple warehouses in real-time using Google Cloud Supply Chain Twin and BigQuery for data-driven stock management.

---

Keeping the right amount of inventory in the right warehouses is one of the hardest problems in supply chain management. Too much stock ties up capital and risks obsolescence. Too little leads to stockouts and lost sales. When you have dozens of warehouses and thousands of SKUs, manual monitoring is impossible.

Google Cloud Supply Chain Twin combined with BigQuery gives you a scalable system for monitoring inventory across your entire warehouse network. This guide covers setting up real-time inventory tracking, building alerts for stockout risks, and creating the queries that power inventory optimization decisions.

## Data Model for Inventory Monitoring

The foundation is a set of BigQuery tables that track current inventory positions and their changes over time.

```sql
-- Current inventory snapshot - updated in near real-time
CREATE TABLE IF NOT EXISTS `project.supply_chain.current_inventory` (
  warehouse_id STRING NOT NULL,
  product_id STRING NOT NULL,
  current_quantity INTEGER NOT NULL,
  reserved_quantity INTEGER DEFAULT 0,    -- Allocated to pending orders
  available_quantity INTEGER,             -- current - reserved
  last_receipt_date TIMESTAMP,
  last_shipment_date TIMESTAMP,
  last_count_date TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(updated_at)
CLUSTER BY warehouse_id, product_id;

-- Inventory movement log - every change is recorded
CREATE TABLE IF NOT EXISTS `project.supply_chain.inventory_movements` (
  movement_id STRING NOT NULL,
  warehouse_id STRING NOT NULL,
  product_id STRING NOT NULL,
  movement_type STRING NOT NULL,          -- receipt, shipment, adjustment, transfer, return
  quantity INTEGER NOT NULL,              -- Positive for inbound, negative for outbound
  reference_id STRING,                    -- PO number, SO number, transfer ID
  movement_timestamp TIMESTAMP NOT NULL,
  recorded_by STRING
)
PARTITION BY DATE(movement_timestamp)
CLUSTER BY warehouse_id, product_id;

-- Product master with planning parameters
CREATE TABLE IF NOT EXISTS `project.supply_chain.product_planning` (
  product_id STRING NOT NULL,
  product_name STRING,
  category STRING,
  safety_stock_days INTEGER DEFAULT 7,
  reorder_point_days INTEGER DEFAULT 14,
  lead_time_days INTEGER DEFAULT 21,
  daily_demand_avg FLOAT64,
  daily_demand_stddev FLOAT64,
  unit_cost NUMERIC,
  unit_price NUMERIC
);
```

## Ingesting Inventory Updates

Stream inventory changes from your warehouse management system into BigQuery through Pub/Sub.

```python
# inventory_ingestion.py - Process inventory updates from WMS
import functions_framework
import base64
import json
import logging
from google.cloud import bigquery
from datetime import datetime

logger = logging.getLogger(__name__)
client = bigquery.Client()


@functions_framework.cloud_event
def process_inventory_update(cloud_event):
    """Process inventory movement events from Pub/Sub."""
    message_data = base64.b64decode(cloud_event.data["message"]["data"])
    event = json.loads(message_data)

    movement_type = event.get("movement_type")
    warehouse_id = event.get("warehouse_id")
    product_id = event.get("product_id")
    quantity = event.get("quantity")

    logger.info(f"Processing {movement_type} for {product_id} at {warehouse_id}: {quantity}")

    # Record the movement
    record_movement(event)

    # Update the current inventory snapshot
    update_current_inventory(warehouse_id, product_id, quantity, movement_type)


def record_movement(event):
    """Insert the movement record into the movements table."""
    rows = [{
        "movement_id": event.get("movement_id", f"MVT-{datetime.utcnow().timestamp()}"),
        "warehouse_id": event["warehouse_id"],
        "product_id": event["product_id"],
        "movement_type": event["movement_type"],
        "quantity": event["quantity"],
        "reference_id": event.get("reference_id"),
        "movement_timestamp": datetime.utcnow().isoformat(),
        "recorded_by": event.get("source_system", "wms"),
    }]

    errors = client.insert_rows_json(
        "project.supply_chain.inventory_movements",
        rows
    )
    if errors:
        logger.error(f"Failed to record movement: {errors}")


def update_current_inventory(warehouse_id, product_id, quantity, movement_type):
    """Update the current inventory snapshot using a MERGE statement."""
    query = """
        MERGE `project.supply_chain.current_inventory` AS target
        USING (
            SELECT
                @warehouse_id AS warehouse_id,
                @product_id AS product_id,
                @quantity AS quantity_change,
                @movement_type AS movement_type,
                CURRENT_TIMESTAMP() AS updated_at
        ) AS source
        ON target.warehouse_id = source.warehouse_id
           AND target.product_id = source.product_id
        WHEN MATCHED THEN
            UPDATE SET
                current_quantity = target.current_quantity + source.quantity_change,
                available_quantity = target.current_quantity + source.quantity_change - target.reserved_quantity,
                last_receipt_date = IF(source.movement_type = 'receipt', source.updated_at, target.last_receipt_date),
                last_shipment_date = IF(source.movement_type = 'shipment', source.updated_at, target.last_shipment_date),
                updated_at = source.updated_at
        WHEN NOT MATCHED THEN
            INSERT (warehouse_id, product_id, current_quantity, reserved_quantity, available_quantity, updated_at)
            VALUES (source.warehouse_id, source.product_id, source.quantity_change, 0, source.quantity_change, source.updated_at)
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("warehouse_id", "STRING", warehouse_id),
            bigquery.ScalarQueryParameter("product_id", "STRING", product_id),
            bigquery.ScalarQueryParameter("quantity", "INT64", quantity),
            bigquery.ScalarQueryParameter("movement_type", "STRING", movement_type),
        ]
    )

    client.query(query, job_config=job_config).result()
```

## Key Monitoring Queries

These queries form the basis of your inventory monitoring system.

### Stockout Risk Assessment

```sql
-- Identify products at risk of stocking out based on current demand rates
-- and remaining inventory levels
SELECT
    ci.warehouse_id,
    w.warehouse_name,
    ci.product_id,
    pp.product_name,
    pp.category,
    ci.available_quantity,
    pp.daily_demand_avg,
    SAFE_DIVIDE(ci.available_quantity, pp.daily_demand_avg) AS days_of_stock,
    pp.safety_stock_days,
    pp.lead_time_days,
    CASE
        WHEN ci.available_quantity <= 0 THEN 'STOCKOUT'
        WHEN SAFE_DIVIDE(ci.available_quantity, pp.daily_demand_avg) < pp.safety_stock_days THEN 'CRITICAL'
        WHEN SAFE_DIVIDE(ci.available_quantity, pp.daily_demand_avg) < pp.reorder_point_days THEN 'REORDER_NEEDED'
        ELSE 'HEALTHY'
    END AS inventory_status
FROM `project.supply_chain.current_inventory` ci
JOIN `project.supply_chain.product_planning` pp ON ci.product_id = pp.product_id
JOIN `project.supply_chain.warehouses` w ON ci.warehouse_id = w.warehouse_id
WHERE SAFE_DIVIDE(ci.available_quantity, pp.daily_demand_avg) < pp.reorder_point_days
ORDER BY days_of_stock ASC;
```

### Inventory Turnover by Warehouse

```sql
-- Calculate inventory turnover rate for each warehouse
-- Higher turnover generally indicates better inventory management
WITH monthly_shipments AS (
    SELECT
        warehouse_id,
        product_id,
        SUM(ABS(quantity)) AS units_shipped
    FROM `project.supply_chain.inventory_movements`
    WHERE movement_type = 'shipment'
      AND movement_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY warehouse_id, product_id
)
SELECT
    ci.warehouse_id,
    w.warehouse_name,
    COUNT(DISTINCT ci.product_id) AS total_skus,
    SUM(ci.current_quantity) AS total_units,
    SUM(ci.current_quantity * pp.unit_cost) AS total_inventory_value,
    SUM(ms.units_shipped) AS monthly_units_shipped,
    SAFE_DIVIDE(SUM(ms.units_shipped) * 12, SUM(ci.current_quantity)) AS annual_turnover_rate
FROM `project.supply_chain.current_inventory` ci
JOIN `project.supply_chain.warehouses` w ON ci.warehouse_id = w.warehouse_id
JOIN `project.supply_chain.product_planning` pp ON ci.product_id = pp.product_id
LEFT JOIN monthly_shipments ms ON ci.warehouse_id = ms.warehouse_id AND ci.product_id = ms.product_id
GROUP BY ci.warehouse_id, w.warehouse_name
ORDER BY annual_turnover_rate DESC;
```

### Dead Stock Identification

```sql
-- Find products with no movement in the last 90 days
-- These tie up warehouse space and capital
SELECT
    ci.warehouse_id,
    ci.product_id,
    pp.product_name,
    ci.current_quantity,
    ci.current_quantity * pp.unit_cost AS inventory_value,
    ci.last_shipment_date,
    ci.last_receipt_date,
    DATE_DIFF(CURRENT_DATE(), DATE(COALESCE(ci.last_shipment_date, ci.last_receipt_date)), DAY) AS days_since_last_movement
FROM `project.supply_chain.current_inventory` ci
JOIN `project.supply_chain.product_planning` pp ON ci.product_id = pp.product_id
WHERE ci.current_quantity > 0
  AND COALESCE(ci.last_shipment_date, ci.last_receipt_date) < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
ORDER BY inventory_value DESC;
```

## Setting Up Automated Alerts

Create Cloud Functions that run these queries on a schedule and alert when thresholds are breached.

```python
# inventory_alerter.py - Check inventory levels and send alerts
import functions_framework
from google.cloud import bigquery
from google.cloud import pubsub_v1
import json
import logging

logger = logging.getLogger(__name__)
client = bigquery.Client()
publisher = pubsub_v1.PublisherClient()

ALERT_TOPIC = publisher.topic_path("YOUR_PROJECT", "inventory-alerts")


@functions_framework.http
def check_inventory_alerts(request):
    """Run inventory health checks and publish alerts."""
    alerts = []

    # Check for stockouts
    stockouts = check_stockouts()
    alerts.extend(stockouts)

    # Check for items below safety stock
    critical_items = check_below_safety_stock()
    alerts.extend(critical_items)

    # Publish alerts
    for alert in alerts:
        publisher.publish(ALERT_TOPIC, json.dumps(alert).encode("utf-8"))

    logger.info(f"Published {len(alerts)} inventory alerts")
    return json.dumps({"alerts_published": len(alerts)}), 200


def check_stockouts():
    """Find products that are currently out of stock."""
    query = """
        SELECT warehouse_id, product_id, pp.product_name, pp.daily_demand_avg
        FROM `project.supply_chain.current_inventory` ci
        JOIN `project.supply_chain.product_planning` pp ON ci.product_id = pp.product_id
        WHERE ci.available_quantity <= 0
          AND pp.daily_demand_avg > 0
    """
    results = client.query(query).result()

    alerts = []
    for row in results:
        alerts.append({
            "alert_type": "STOCKOUT",
            "severity": "critical",
            "warehouse_id": row.warehouse_id,
            "product_id": row.product_id,
            "product_name": row.product_name,
            "message": f"STOCKOUT: {row.product_name} at warehouse {row.warehouse_id}",
        })

    return alerts
```

Schedule the alert checker.

```bash
# Run inventory checks every 15 minutes
gcloud scheduler jobs create http inventory-health-check \
  --location=us-central1 \
  --schedule="*/15 * * * *" \
  --uri="https://us-central1-YOUR_PROJECT.cloudfunctions.net/inventory-alerter" \
  --http-method=POST \
  --oidc-service-account-email=monitoring-sa@YOUR_PROJECT.iam.gserviceaccount.com
```

## Wrapping Up

Monitoring inventory across a warehouse network with Supply Chain Twin and BigQuery gives you the data foundation for smarter stock decisions. The real-time ingestion pipeline keeps your inventory view current, the monitoring queries identify risks before they become problems, and the automated alerts ensure the right people know when action is needed. The key is building this monitoring incrementally - start with stockout alerts, add turnover analysis, then expand to dead stock identification and demand forecasting.
