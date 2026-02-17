# How to Implement Data Vault 2.0 Modeling in BigQuery for Enterprise Data Warehousing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Data Vault, Data Warehousing, Data Modeling

Description: Learn how to implement Data Vault 2.0 modeling patterns in BigQuery for scalable, auditable enterprise data warehousing with hubs, links, and satellites.

---

Data Vault 2.0 is a data modeling methodology designed for enterprise data warehouses that need to handle multiple source systems, frequent schema changes, and full auditability. If you are building a data warehouse in BigQuery that pulls from dozens of sources and needs to track every change over time, Data Vault is worth considering.

Unlike traditional dimensional modeling (star schemas), Data Vault separates the structural aspects of your data (what entities exist and how they relate) from the descriptive aspects (what attributes those entities have). This makes it much easier to add new sources and handle schema changes without rewriting your entire warehouse.

## Data Vault 2.0 Core Concepts

Data Vault has three main table types:

**Hubs** store unique business keys. Each hub represents a core business concept (Customer, Product, Order) and contains only the business key, a hash key, the load date, and the record source. No descriptive attributes live here.

**Links** store relationships between hubs. A link connects two or more hubs and represents a business event or association. Like hubs, links contain only keys, the load date, and the record source.

**Satellites** store the descriptive attributes and their history. Each satellite is attached to either a hub or a link and tracks every change to the attributes over time.

## Setting Up Hubs in BigQuery

Let's build a Data Vault model for an e-commerce scenario with customers, products, and orders.

```sql
-- Hub for Customer business keys
CREATE TABLE IF NOT EXISTS `my-project.raw_vault.hub_customer` (
  -- Hash of the business key for consistent joining
  customer_hk BYTES NOT NULL,
  -- The actual business key from the source system
  customer_bk STRING NOT NULL,
  -- When this record was first loaded
  load_date TIMESTAMP NOT NULL,
  -- Which source system provided this record
  record_source STRING NOT NULL,
)
PARTITION BY DATE(load_date)
CLUSTER BY customer_hk;

-- Hub for Product business keys
CREATE TABLE IF NOT EXISTS `my-project.raw_vault.hub_product` (
  product_hk BYTES NOT NULL,
  product_bk STRING NOT NULL,
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
)
PARTITION BY DATE(load_date)
CLUSTER BY product_hk;

-- Hub for Order business keys
CREATE TABLE IF NOT EXISTS `my-project.raw_vault.hub_order` (
  order_hk BYTES NOT NULL,
  order_bk STRING NOT NULL,
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
)
PARTITION BY DATE(load_date)
CLUSTER BY order_hk;
```

The hash key is generated from the business key using a consistent hashing function:

```sql
-- Loading data into a hub - only insert new business keys
MERGE INTO `my-project.raw_vault.hub_customer` AS target
USING (
  SELECT DISTINCT
    -- Generate a hash key from the business key
    MD5(CAST(customer_id AS STRING)) AS customer_hk,
    CAST(customer_id AS STRING) AS customer_bk,
    CURRENT_TIMESTAMP() AS load_date,
    'crm_system' AS record_source
  FROM `my-project.staging.crm_customers`
) AS source
ON target.customer_hk = source.customer_hk
-- Only insert if the business key does not already exist
WHEN NOT MATCHED THEN
  INSERT (customer_hk, customer_bk, load_date, record_source)
  VALUES (source.customer_hk, source.customer_bk, source.load_date, source.record_source);
```

## Setting Up Links

Links connect hubs and represent relationships or transactions:

```sql
-- Link table connecting customers and orders
CREATE TABLE IF NOT EXISTS `my-project.raw_vault.link_customer_order` (
  -- Hash of the combined business keys
  customer_order_hk BYTES NOT NULL,
  -- Foreign hash keys to the parent hubs
  customer_hk BYTES NOT NULL,
  order_hk BYTES NOT NULL,
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
)
PARTITION BY DATE(load_date)
CLUSTER BY customer_order_hk;

-- Link table for order line items (order to product)
CREATE TABLE IF NOT EXISTS `my-project.raw_vault.link_order_product` (
  order_product_hk BYTES NOT NULL,
  order_hk BYTES NOT NULL,
  product_hk BYTES NOT NULL,
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
)
PARTITION BY DATE(load_date)
CLUSTER BY order_product_hk;
```

Loading links follows a similar pattern:

```sql
-- Load relationships into the link table
MERGE INTO `my-project.raw_vault.link_customer_order` AS target
USING (
  SELECT DISTINCT
    -- Hash of the combined keys creates the link hash key
    MD5(CONCAT(CAST(customer_id AS STRING), '|', CAST(order_id AS STRING))) AS customer_order_hk,
    MD5(CAST(customer_id AS STRING)) AS customer_hk,
    MD5(CAST(order_id AS STRING)) AS order_hk,
    CURRENT_TIMESTAMP() AS load_date,
    'order_system' AS record_source
  FROM `my-project.staging.orders`
) AS source
ON target.customer_order_hk = source.customer_order_hk
WHEN NOT MATCHED THEN
  INSERT (customer_order_hk, customer_hk, order_hk, load_date, record_source)
  VALUES (source.customer_order_hk, source.customer_hk, source.order_hk, source.load_date, source.record_source);
```

## Setting Up Satellites

Satellites hold the descriptive data and track changes over time:

```sql
-- Satellite for customer attributes from the CRM system
CREATE TABLE IF NOT EXISTS `my-project.raw_vault.sat_customer_crm` (
  customer_hk BYTES NOT NULL,
  -- Hash of the descriptive attributes for change detection
  hashdiff BYTES NOT NULL,
  -- Descriptive attributes
  first_name STRING,
  last_name STRING,
  email STRING,
  phone STRING,
  address STRING,
  city STRING,
  country STRING,
  -- Metadata
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
)
PARTITION BY DATE(load_date)
CLUSTER BY customer_hk;

-- Satellite for customer attributes from the website system
CREATE TABLE IF NOT EXISTS `my-project.raw_vault.sat_customer_web` (
  customer_hk BYTES NOT NULL,
  hashdiff BYTES NOT NULL,
  -- Web-specific attributes
  username STRING,
  last_login TIMESTAMP,
  preferences JSON,
  account_status STRING,
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
)
PARTITION BY DATE(load_date)
CLUSTER BY customer_hk;
```

Loading satellites is where the change detection happens:

```sql
-- Load satellite data with change detection
INSERT INTO `my-project.raw_vault.sat_customer_crm`
SELECT
  source.customer_hk,
  source.hashdiff,
  source.first_name,
  source.last_name,
  source.email,
  source.phone,
  source.address,
  source.city,
  source.country,
  source.load_date,
  source.record_source
FROM (
  SELECT
    MD5(CAST(customer_id AS STRING)) AS customer_hk,
    -- Hash of all descriptive columns for change detection
    MD5(CONCAT(
      COALESCE(first_name, ''),
      COALESCE(last_name, ''),
      COALESCE(email, ''),
      COALESCE(phone, ''),
      COALESCE(address, ''),
      COALESCE(city, ''),
      COALESCE(country, '')
    )) AS hashdiff,
    first_name, last_name, email, phone, address, city, country,
    CURRENT_TIMESTAMP() AS load_date,
    'crm_system' AS record_source
  FROM `my-project.staging.crm_customers`
) AS source
-- Only load if the attributes have actually changed
LEFT JOIN (
  -- Get the most recent satellite record for each customer
  SELECT customer_hk, hashdiff
  FROM `my-project.raw_vault.sat_customer_crm`
  QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_hk ORDER BY load_date DESC) = 1
) AS current_sat
ON source.customer_hk = current_sat.customer_hk
   AND source.hashdiff = current_sat.hashdiff
-- Only insert when there is no match (new customer or changed attributes)
WHERE current_sat.customer_hk IS NULL;
```

## Building Business Vault Views

The raw vault stores everything, but business users need a friendlier interface. Create views in a business vault layer:

```sql
-- Business vault view: current customer profile
CREATE VIEW `my-project.business_vault.v_current_customer` AS
SELECT
  h.customer_bk AS customer_id,
  crm.first_name,
  crm.last_name,
  crm.email,
  crm.phone,
  crm.city,
  crm.country,
  web.username,
  web.last_login,
  web.account_status
FROM `my-project.raw_vault.hub_customer` h
-- Join the latest CRM satellite record
LEFT JOIN (
  SELECT *
  FROM `my-project.raw_vault.sat_customer_crm`
  QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_hk ORDER BY load_date DESC) = 1
) crm ON h.customer_hk = crm.customer_hk
-- Join the latest web satellite record
LEFT JOIN (
  SELECT *
  FROM `my-project.raw_vault.sat_customer_web`
  QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_hk ORDER BY load_date DESC) = 1
) web ON h.customer_hk = web.customer_hk;
```

## Automating the Load Process

Use a DAG in Cloud Composer to orchestrate the loading sequence:

```python
# Simplified Airflow DAG for Data Vault loading
from airflow import DAG
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator
from datetime import datetime

with DAG('data_vault_daily_load', schedule_interval='@daily',
         start_date=datetime(2026, 1, 1), catchup=False) as dag:

    # Load hubs first - they have no dependencies on each other
    load_hub_customer = BigQueryInsertJobOperator(
        task_id='load_hub_customer',
        configuration={'query': {'query': '{% include "sql/hub_customer.sql" %}', 'useLegacySql': False}},
    )

    load_hub_product = BigQueryInsertJobOperator(
        task_id='load_hub_product',
        configuration={'query': {'query': '{% include "sql/hub_product.sql" %}', 'useLegacySql': False}},
    )

    # Load links after hubs
    load_link_customer_order = BigQueryInsertJobOperator(
        task_id='load_link_customer_order',
        configuration={'query': {'query': '{% include "sql/link_customer_order.sql" %}', 'useLegacySql': False}},
    )

    # Load satellites after hubs
    load_sat_customer = BigQueryInsertJobOperator(
        task_id='load_sat_customer_crm',
        configuration={'query': {'query': '{% include "sql/sat_customer_crm.sql" %}', 'useLegacySql': False}},
    )

    # Define dependencies
    [load_hub_customer, load_hub_product] >> load_link_customer_order
    load_hub_customer >> load_sat_customer
```

## Why Data Vault in BigQuery

BigQuery's architecture is actually a good fit for Data Vault because of its column-oriented storage and partitioning capabilities. Satellites, which are the largest tables in a Data Vault, benefit from partitioning by load date and clustering by hash key. BigQuery's MERGE statement works well for the insert-if-not-exists pattern that hubs and links require.

The main tradeoff is that Data Vault queries often involve multiple joins across hubs, links, and satellites. BigQuery handles this well for analytical workloads, but you should materialize your most-used business vault views as tables for the best performance.

If you are monitoring your BigQuery costs with OneUptime, you will want to keep an eye on the satellite loading queries since they involve the hashdiff comparison against the full history, which can scan significant amounts of data as your vault grows.

Data Vault is not the simplest modeling approach, but for enterprises dealing with multiple source systems and regulatory requirements around data lineage and auditability, it provides a solid foundation that scales well in BigQuery.
