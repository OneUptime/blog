# How to Publish and Subscribe to Shared Datasets Using BigQuery Analytics Hub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Analytics Hub, Data Sharing, Data Exchange

Description: Learn how to use BigQuery Analytics Hub to publish datasets as listings and subscribe to shared data across organizations without copying data.

---

Sharing data between teams, organizations, and business partners has traditionally been a headache. You export data, upload it somewhere, deal with access permissions, and worry about keeping copies in sync. BigQuery Analytics Hub simplifies this by letting data publishers create listings that subscribers can link to directly. The data is not copied - subscribers get a read-only linked dataset that always reflects the latest data from the publisher. Think of it as a marketplace for data within and across organizations.

## How Analytics Hub Works

Analytics Hub has three core concepts:

- **Data Exchange**: A container for listings, like a catalog. You can create private exchanges for internal sharing or public ones for external partners.
- **Listing**: A published dataset or set of tables within an exchange. Includes metadata like description, documentation, and contact info.
- **Subscription**: When someone subscribes to a listing, they get a linked dataset in their project that references the publisher's data.

The data never moves. Subscribers query the linked dataset and the queries read from the publisher's tables. The publisher controls access and can revoke it at any time.

## Creating a Data Exchange

Start by creating a data exchange. This is the container where you will publish listings:

```bash
# Create a data exchange for sharing analytics data
gcloud bigquery analytics-hub data-exchanges create analytics_exchange \
  --location=us \
  --display-name="Company Analytics Data Exchange" \
  --description="Internal data exchange for sharing analytics datasets across teams"
```

You can also create exchanges through the BigQuery console under Analytics Hub.

## Publishing a Listing

To publish data, create a listing within the exchange that points to a BigQuery dataset:

```bash
# Create a listing that publishes the sales_analytics dataset
gcloud bigquery analytics-hub listings create sales_data_listing \
  --data-exchange=analytics_exchange \
  --location=us \
  --display-name="Sales Analytics Data" \
  --description="Daily sales metrics, product performance, and customer analytics" \
  --primary-contact="data-team@company.com" \
  --bigquery-dataset="projects/my-project/datasets/sales_analytics"
```

You can also do this in SQL by setting up the dataset and permissions, then creating the listing through the API or console.

Before publishing, make sure the dataset you are sharing is well-organized:

```sql
-- Prepare the dataset for sharing
-- Create views that expose only the data you want to share
-- This gives you control over what subscribers see

CREATE OR REPLACE VIEW `my_project.sales_analytics.daily_metrics` AS
SELECT
  order_date,
  product_category,
  region,
  COUNT(DISTINCT order_id) AS order_count,
  COUNT(DISTINCT customer_id) AS unique_customers,
  SUM(revenue) AS total_revenue,
  AVG(order_value) AS avg_order_value
FROM `my_project.internal_sales.orders`
GROUP BY order_date, product_category, region;

CREATE OR REPLACE VIEW `my_project.sales_analytics.product_performance` AS
SELECT
  product_id,
  product_name,
  category,
  SUM(quantity_sold) AS total_units_sold,
  SUM(revenue) AS total_revenue,
  AVG(customer_rating) AS avg_rating
FROM `my_project.internal_sales.order_items`
JOIN `my_project.internal_sales.products` USING (product_id)
GROUP BY product_id, product_name, category;
```

## Managing Access to Listings

You can control who can see and subscribe to your listings:

```bash
# Grant a specific team the ability to subscribe to the listing
gcloud bigquery analytics-hub listings add-iam-policy-binding \
  sales_data_listing \
  --data-exchange=analytics_exchange \
  --location=us \
  --member="group:marketing-analytics@company.com" \
  --role="roles/analyticshub.subscriber"
```

For public listings (sharing with external organizations):

```bash
# Make a listing available to all authenticated users
gcloud bigquery analytics-hub listings add-iam-policy-binding \
  public_weather_data \
  --data-exchange=public_exchange \
  --location=us \
  --member="allAuthenticatedUsers" \
  --role="roles/analyticshub.viewer"
```

## Subscribing to a Listing

When a subscriber wants to access shared data, they create a subscription that creates a linked dataset in their project:

```bash
# Subscribe to a listing - creates a linked dataset in the subscriber's project
gcloud bigquery analytics-hub listings subscribe sales_data_listing \
  --data-exchange=analytics_exchange \
  --location=us \
  --destination-dataset="projects/subscriber-project/datasets/shared_sales_data"
```

After subscribing, the linked dataset appears in the subscriber's project:

```sql
-- Subscriber can now query the shared data directly
-- This reads from the publisher's tables without copying data
SELECT
  order_date,
  product_category,
  total_revenue
FROM `subscriber-project.shared_sales_data.daily_metrics`
WHERE order_date >= '2025-01-01'
ORDER BY total_revenue DESC;
```

## Cross-Organization Sharing

Analytics Hub truly shines for cross-organization data sharing. A data provider can publish datasets that customers, partners, or the public can subscribe to:

```bash
# Create a public exchange for commercial data products
gcloud bigquery analytics-hub data-exchanges create commercial_data_exchange \
  --location=us \
  --display-name="Acme Data Products" \
  --description="Commercial datasets available for subscription"

# Publish a listing for a commercial dataset
gcloud bigquery analytics-hub listings create market_trends \
  --data-exchange=commercial_data_exchange \
  --location=us \
  --display-name="Market Trends Dataset" \
  --description="Daily market trend indicators across 50 sectors" \
  --primary-contact="data-products@acme.com" \
  --documentation="https://docs.acme.com/market-trends" \
  --bigquery-dataset="projects/acme-data/datasets/market_trends_public"
```

External subscribers from different organizations can browse the exchange and subscribe just like internal users.

## Listing Configuration Options

When creating a listing, you have several configuration options:

```bash
# Create a listing with restricted subscription
# Only subscribers you approve can access the data
gcloud bigquery analytics-hub listings create restricted_dataset \
  --data-exchange=analytics_exchange \
  --location=us \
  --display-name="Restricted Financial Data" \
  --description="Financial performance metrics - requires approval" \
  --request-access-email="data-access@company.com" \
  --bigquery-dataset="projects/my-project/datasets/financial_metrics" \
  --restricted-export-config
```

The `--restricted-export-config` flag prevents subscribers from exporting data out of BigQuery, adding an extra layer of data governance.

## Monitoring Subscriptions

As a publisher, you want to know who is using your shared data:

```bash
# List all subscriptions to your listings
gcloud bigquery analytics-hub listings list-subscriptions sales_data_listing \
  --data-exchange=analytics_exchange \
  --location=us
```

You can also query Cloud Audit Logs to track how subscribers are accessing the data:

```sql
-- Query audit logs for data access on shared datasets
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail,
  protopayload_auditlog.methodName,
  resource.labels.dataset_id,
  timestamp
FROM `my_project.audit_logs.cloudaudit_googleapis_com_data_access`
WHERE resource.labels.dataset_id = 'sales_analytics'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY timestamp DESC;
```

## Updating Shared Data

One of the biggest advantages of Analytics Hub is that updates are automatic. When you update data in the published dataset, subscribers immediately see the changes:

```sql
-- Publisher updates data as part of normal ETL
-- Subscribers automatically see the new data - no action needed
INSERT INTO `my_project.sales_analytics.daily_metrics`
SELECT
  CURRENT_DATE() AS order_date,
  product_category,
  region,
  COUNT(DISTINCT order_id),
  COUNT(DISTINCT customer_id),
  SUM(revenue),
  AVG(order_value)
FROM `my_project.internal_sales.orders`
WHERE DATE(order_timestamp) = CURRENT_DATE()
GROUP BY product_category, region;
```

## Revoking Access

If you need to stop sharing data with a subscriber:

```bash
# Revoke a subscription
gcloud bigquery analytics-hub subscriptions delete \
  projects/subscriber-project/locations/us/subscriptions/subscription-id

# Or remove the subscriber's IAM permissions on the listing
gcloud bigquery analytics-hub listings remove-iam-policy-binding \
  sales_data_listing \
  --data-exchange=analytics_exchange \
  --location=us \
  --member="group:former-partner@external.com" \
  --role="roles/analyticshub.subscriber"
```

## Best Practices

Publish views rather than raw tables. Views let you control exactly what data is exposed and add computed columns or filters without affecting the underlying tables. They also let you change the underlying schema without breaking subscribers.

Add comprehensive documentation to your listings. Include data dictionaries, update schedules, known limitations, and contact information. Good documentation reduces support burden and increases subscriber confidence.

Use restricted export when sharing sensitive data outside your organization. This prevents subscribers from exporting data to external destinations, keeping it within BigQuery's security perimeter.

Analytics Hub transforms data sharing from a manual, error-prone process into a managed, governed, and efficient one. Whether you are sharing data within a large organization or building a commercial data product, it provides the infrastructure to do it right.
