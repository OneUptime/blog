# How to Build a Data Mesh Architecture on GCP Using Dataplex Data Domains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataplex, Data Mesh, Data Domains, Data Governance, Data Architecture

Description: Learn how to implement a data mesh architecture on GCP using Dataplex to organize data into domains, enable self-serve data infrastructure, and maintain federated governance.

---

Data mesh is an organizational and architectural approach where domain teams own and manage their own data products. Instead of a central data team that owns all the data (and becomes a bottleneck), each business domain - orders, customers, inventory, marketing - manages its own data pipeline, quality, and governance. Dataplex is one GCP service you can use to implement this pattern, providing the organizational structure, access control, and governance layer that makes data mesh practical.

## Data Mesh Principles

Before getting into the implementation, let us review the four principles of data mesh:

1. Domain ownership: Each business domain owns its data end-to-end
2. Data as a product: Domain teams treat their data outputs as products with SLAs, documentation, and quality guarantees
3. Self-serve data infrastructure: A shared platform provides the tools teams need without requiring central team involvement
4. Federated computational governance: Policies are defined centrally but enforced locally by each domain

Dataplex maps to these principles through its lake, zone, and asset hierarchy plus its governance features.

## Setting Up the Dataplex Structure

### Creating Data Domains as Lakes

Each business domain gets its own Dataplex lake. A lake is the top-level organizational unit:

```bash
# Create a lake for each business domain

# Each lake represents a domain team's data territory

# Orders domain
gcloud dataplex lakes create orders-domain \
  --location=us-central1 \
  --display-name="Orders Domain" \
  --description="Owned by the Orders team. Contains all order-related data products." \
  --labels=domain=orders,team=orders-engineering

# Customers domain
gcloud dataplex lakes create customers-domain \
  --location=us-central1 \
  --display-name="Customers Domain" \
  --description="Owned by the Customer Success team. Contains customer profiles and engagement data." \
  --labels=domain=customers,team=customer-success

# Marketing domain
gcloud dataplex lakes create marketing-domain \
  --location=us-central1 \
  --display-name="Marketing Domain" \
  --description="Owned by the Marketing Analytics team. Contains campaign and attribution data." \
  --labels=domain=marketing,team=marketing-analytics

# Inventory domain
gcloud dataplex lakes create inventory-domain \
  --location=us-central1 \
  --display-name="Inventory Domain" \
  --description="Owned by the Supply Chain team. Contains warehouse and stock data." \
  --labels=domain=inventory,team=supply-chain
```

### Creating Zones Within Each Domain

Zones represent the data lifecycle stages within a domain. Most domains have a raw zone (landing data) and a curated zone (cleaned, modeled data products):

```bash
# Create zones for the Orders domain

# Raw zone: where source data lands before transformation
gcloud dataplex zones create orders-raw \
  --lake=orders-domain \
  --location=us-central1 \
  --type=RAW \
  --resource-location-type=SINGLE_REGION \
  --display-name="Orders Raw Data" \
  --description="Raw order data from transactional systems. Not for direct consumption."

# Curated zone: cleaned, modeled data products ready for consumption
gcloud dataplex zones create orders-curated \
  --lake=orders-domain \
  --location=us-central1 \
  --type=CURATED \
  --resource-location-type=SINGLE_REGION \
  --display-name="Orders Data Products" \
  --description="Curated order data products. Quality-checked and ready for downstream use."
```

### Attaching Data Assets

Connect your actual BigQuery datasets and Cloud Storage buckets to the zones:

```bash
# Attach BigQuery datasets as assets within the Orders domain

# Raw data asset
gcloud dataplex assets create orders-raw-bq \
  --lake=orders-domain \
  --zone=orders-raw \
  --location=us-central1 \
  --resource-type=BIGQUERY_DATASET \
  --resource-name="projects/my-project/datasets/orders_raw" \
  --display-name="Raw Orders BigQuery Dataset"

# Curated data product asset
gcloud dataplex assets create orders-products-bq \
  --lake=orders-domain \
  --zone=orders-curated \
  --location=us-central1 \
  --resource-type=BIGQUERY_DATASET \
  --resource-name="projects/my-project/datasets/orders_products" \
  --display-name="Orders Data Products BigQuery Dataset"

# Cloud Storage asset for raw files
gcloud dataplex assets create orders-raw-gcs \
  --lake=orders-domain \
  --zone=orders-raw \
  --location=us-central1 \
  --resource-type=STORAGE_BUCKET \
  --resource-name="projects/my-project/buckets/orders-raw-data" \
  --display-name="Raw Orders File Storage"
```

## Defining Data Products

A data product is a curated dataset that a domain team publishes for consumption by other teams. In the data mesh model, it should have clear ownership, documentation, quality standards, and an SLA.

### Documenting Data Products with Dataplex Aspects

```json
{
  "name": "data_product_metadata",
  "type": "record",
  "recordFields": [
    {
      "name": "owner_team",
      "type": "string",
      "index": 1,
      "annotations": {
        "displayName": "Owner Team"
      },
      "constraints": {
        "required": true
      }
    },
    {
      "name": "sla_freshness_hours",
      "type": "double",
      "index": 2,
      "annotations": {
        "displayName": "Freshness SLA (hours)"
      },
      "constraints": {
        "required": true
      }
    },
    {
      "name": "quality_score",
      "type": "double",
      "index": 3,
      "annotations": {
        "displayName": "Data Quality Score (0-100)"
      }
    },
    {
      "name": "update_frequency",
      "type": "string",
      "index": 4,
      "annotations": {
        "displayName": "Update Frequency"
      }
    },
    {
      "name": "pii_contains",
      "type": "bool",
      "index": 5,
      "annotations": {
        "displayName": "Contains PII"
      }
    }
  ]
}
```

Save the file as `data-product-aspect.json`, then create an aspect type for data products:

```bash
# Add rich metadata to a data product table using Dataplex aspects
gcloud dataplex aspect-types create data-product-template \
  --location=us-central1 \
  --display-name="Data Product Metadata" \
  --metadata-template-file-name=data-product-aspect.json
```

Apply the aspect to a data product entry:

```yaml
# data-product-aspect-values.yaml
my-project.us-central1.data-product-template:
  data:
    owner_team: orders-engineering
    sla_freshness_hours: 6.0
    quality_score: 98.5
    update_frequency: hourly
    pii_contains: false
```

```bash
# Find the Dataplex entry for the BigQuery table, then update that entry's aspects.
gcloud dataplex entries search \
  "fully_qualified_name:bigquery:my-project.orders_products.order_summary" \
  --project=my-project \
  --scope=projects/my-project

gcloud dataplex entries update-aspects ENTRY_ID \
  --location=us-central1 \
  --entry-group=@bigquery \
  --project=my-project \
  --aspects=data-product-aspect-values.yaml
```

## Implementing Domain Ownership with IAM

Each domain team needs the right permissions to manage their own data without affecting other domains:

```bash
# Grant the Orders team ownership of their domain's resources

# Create a Google Group for the Orders domain team
# (Done in Google Workspace admin, not gcloud)

# Grant Dataplex Editor on the Orders lake
gcloud dataplex lakes add-iam-policy-binding orders-domain \
  --location=us-central1 \
  --member="group:orders-team@company.com" \
  --role="roles/dataplex.editor"

# Grant BigQuery Data Owner on each dataset they own
bq query --use_legacy_sql=false \
  'GRANT `roles/bigquery.dataOwner`
  ON SCHEMA `my-project`.orders_raw
  TO "group:orders-team@company.com"'

bq query --use_legacy_sql=false \
  'GRANT `roles/bigquery.dataOwner`
  ON SCHEMA `my-project`.orders_products
  TO "group:orders-team@company.com"'

# Grant read access to other domains' data products (not raw data)
# The Marketing team can read Orders data products
gcloud dataplex zones add-iam-policy-binding orders-curated \
  --lake=orders-domain \
  --location=us-central1 \
  --member="group:marketing-team@company.com" \
  --role="roles/dataplex.dataReader"
```

## Federated Governance with Data Quality Rules

Dataplex data quality tasks use CloudDQ YAML specifications that domain teams can define and manage for their own data products:

```yaml
# data_quality_rules.yaml
# Each domain team maintains their own quality rules
# These are enforced by Dataplex data quality tasks

rules:
  ORDER_ID_NOT_NULL:
    rule_type: NOT_NULL
    dimension: completeness

  ORDER_ID_UNIQUE:
    rule_type: CUSTOM_SQL_STATEMENT
    dimension: uniqueness
    params:
      custom_sql_arguments:
        - column_names
      custom_sql_statement: |-
        SELECT a.*
        FROM data a
        INNER JOIN (
          SELECT $column_names
          FROM data
          GROUP BY $column_names
          HAVING COUNT(*) > 1
        ) duplicates
        USING ($column_names)

  TOTAL_AMOUNT_NON_NEGATIVE:
    rule_type: CUSTOM_SQL_EXPR
    dimension: accuracy
    params:
      custom_sql_expr: |-
        $column >= 0

  ORDER_DATA_FRESH:
    rule_type: CUSTOM_SQL_STATEMENT
    dimension: timeliness
    params:
      custom_sql_statement: |-
        SELECT MAX(order_timestamp) AS latest_order_timestamp
        FROM data
        HAVING TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), latest_order_timestamp, HOUR) > 6

  ORDER_ROW_COUNT_MIN:
    rule_type: CUSTOM_SQL_STATEMENT
    dimension: completeness
    params:
      custom_sql_statement: |-
        SELECT COUNT(*) AS row_count
        FROM data
        HAVING row_count < 1000

row_filters:
  NONE:
    filter_sql_expr: |-
      True

rule_dimensions:
  - completeness
  - uniqueness
  - accuracy
  - timeliness

rule_bindings:
  ORDER_SUMMARY_ORDER_ID_NOT_NULL:
    entity_uri: bigquery://projects/my-project/datasets/orders_products/tables/order_summary
    column_id: order_id
    row_filter_id: NONE
    rule_ids:
      - ORDER_ID_NOT_NULL

  ORDER_SUMMARY_ORDER_ID_UNIQUE:
    entity_uri: bigquery://projects/my-project/datasets/orders_products/tables/order_summary
    column_id: order_id
    row_filter_id: NONE
    rule_ids:
      - ORDER_ID_UNIQUE:
          column_names: "order_id"

  ORDER_SUMMARY_TOTAL_AMOUNT_NON_NEGATIVE:
    entity_uri: bigquery://projects/my-project/datasets/orders_products/tables/order_summary
    column_id: total_amount
    row_filter_id: NONE
    rule_ids:
      - TOTAL_AMOUNT_NON_NEGATIVE

  ORDER_SUMMARY_FRESHNESS:
    entity_uri: bigquery://projects/my-project/datasets/orders_products/tables/order_summary
    column_id: order_timestamp
    row_filter_id: NONE
    rule_ids:
      - ORDER_DATA_FRESH

  ORDER_SUMMARY_ROW_COUNT:
    entity_uri: bigquery://projects/my-project/datasets/orders_products/tables/order_summary
    row_filter_id: NONE
    rule_ids:
      - ORDER_ROW_COUNT_MIN
```

```bash
# Create a Dataplex data quality task that runs these rules
export DATAPLEX_REGION_ID="us-central1"
export DATAPLEX_PUBLIC_GCS_BUCKET_NAME="dataplex-clouddq-artifacts-${DATAPLEX_REGION_ID}"
export USER_CLOUDDQ_YAML_CONFIGS_GCS_PATH="gs://my-config-bucket/data_quality_rules.yaml"
export DATAPLEX_TASK_SERVICE_ACCOUNT="orders-dq-runner@my-project.iam.gserviceaccount.com"
export TARGET_BQ_DATASET="data_quality"
export TARGET_BQ_TABLE="orders_quality_results"

gcloud dataplex tasks create orders-quality-check \
  --lake=orders-domain \
  --location="${DATAPLEX_REGION_ID}" \
  --trigger-type=RECURRING \
  --trigger-schedule="0 * * * *" \
  --execution-service-account="${DATAPLEX_TASK_SERVICE_ACCOUNT}" \
  --spark-python-script-file="gs://${DATAPLEX_PUBLIC_GCS_BUCKET_NAME}/clouddq_pyspark_driver.py" \
  --spark-file-uris="gs://${DATAPLEX_PUBLIC_GCS_BUCKET_NAME}/clouddq-executable.zip","gs://${DATAPLEX_PUBLIC_GCS_BUCKET_NAME}/clouddq-executable.zip.hashsum","${USER_CLOUDDQ_YAML_CONFIGS_GCS_PATH}" \
  --execution-args=^::^TASK_ARGS="clouddq-executable.zip, ALL, ${USER_CLOUDDQ_YAML_CONFIGS_GCS_PATH}, --gcp_project_id='my-project', --gcp_region_id='${DATAPLEX_REGION_ID}', --gcp_bq_dataset_id='${TARGET_BQ_DATASET}', --target_bigquery_summary_table='my-project.${TARGET_BQ_DATASET}.${TARGET_BQ_TABLE}'"
```

## Self-Serve Data Infrastructure

The platform team provides shared infrastructure that domain teams use without requiring central involvement.

### Shared dbt Project Template

Create a template that domain teams clone for their dbt projects:

```yaml
# Template dbt_project.yml for domain teams
# Domain teams customize this for their specific domain
name: '{{ domain_name }}_analytics'
version: '1.0.0'
config-version: 2

profile: '{{ domain_name }}'

vars:
  domain: '{{ domain_name }}'
  raw_dataset: '{{ domain_name }}_raw'
  product_dataset: '{{ domain_name }}_products'

models:
  '{{ domain_name }}_analytics':
    staging:
      +materialized: view
      +schema: "{{ var('raw_dataset') }}"
    products:
      +materialized: table
      +schema: "{{ var('product_dataset') }}"
      +tags: ['data_product']
```

### Shared Data Quality Framework

Provide a reusable quality framework that all domains use:

```python
# Shared quality check library used by all domain teams
# Lives in a common package that teams import

from google.cloud import bigquery

class DataProductQualityChecker:
    def __init__(self, project_id, dataset_id, table_id):
        self.client = bigquery.Client(project=project_id)
        self.table_ref = f"{project_id}.{dataset_id}.{table_id}"
        self.results = []

    def check_not_null(self, column):
        """Assert that a column has no NULL values."""
        query = f"SELECT COUNT(*) as cnt FROM `{self.table_ref}` WHERE {column} IS NULL"
        result = list(self.client.query(query).result())[0]
        passed = result.cnt == 0
        self.results.append({
            'check': f'not_null_{column}',
            'passed': passed,
            'failing_rows': result.cnt
        })
        return self

    def check_unique(self, column):
        """Assert that a column has no duplicate values."""
        query = f"""
            SELECT COUNT(*) as cnt FROM (
                SELECT {column}, COUNT(*) as c
                FROM `{self.table_ref}`
                GROUP BY {column} HAVING c > 1
            )
        """
        result = list(self.client.query(query).result())[0]
        passed = result.cnt == 0
        self.results.append({
            'check': f'unique_{column}',
            'passed': passed,
            'failing_rows': result.cnt
        })
        return self

    def check_freshness(self, timestamp_column, max_hours):
        """Assert that data is not stale beyond a threshold."""
        query = f"""
            SELECT TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
                MAX({timestamp_column}), HOUR) as hours_stale
            FROM `{self.table_ref}`
        """
        result = list(self.client.query(query).result())[0]
        passed = result.hours_stale <= max_hours
        self.results.append({
            'check': f'freshness_{timestamp_column}',
            'passed': passed,
            'details': f'{result.hours_stale} hours stale (max: {max_hours})'
        })
        return self

    def report(self):
        """Return the quality report."""
        all_passed = all(r['passed'] for r in self.results)
        return {
            'table': self.table_ref,
            'overall_status': 'pass' if all_passed else 'fail',
            'checks': self.results
        }
```

## Discovering Data Products Across Domains

Teams need to find data products from other domains. Dataplex provides search capabilities:

```bash
# Search for data products across all domains
gcloud dataplex entries search \
  "aspect:my-project.us-central1.data-product-template" \
  --project=my-project \
  --scope=projects/my-project

# Search for data products containing customer data
gcloud dataplex entries search \
  "column:customer_id type=bigquery-table" \
  --project=my-project \
  --scope=projects/my-project
```

## Wrapping Up

Data mesh on GCP with Dataplex provides a structured way to scale data ownership across teams. Dataplex lakes map to business domains, zones separate raw from curated data, and IAM policies enforce domain-level access control. Dataplex aspects document data products with ownership, SLAs, and quality scores. The shared infrastructure layer - dbt templates, quality frameworks, and governance policies - gives domain teams the tools they need to be self-sufficient. The result is an architecture where domain teams move fast independently while maintaining the governance and discoverability that the organization needs.
