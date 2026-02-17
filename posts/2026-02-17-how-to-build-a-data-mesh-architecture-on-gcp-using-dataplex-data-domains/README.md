# How to Build a Data Mesh Architecture on GCP Using Dataplex Data Domains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataplex, Data Mesh, Data Domains, Data Governance, Data Architecture

Description: Learn how to implement a data mesh architecture on GCP using Dataplex to organize data into domains, enable self-serve data infrastructure, and maintain federated governance.

---

Data mesh is an organizational and architectural approach where domain teams own and manage their own data products. Instead of a central data team that owns all the data (and becomes a bottleneck), each business domain - orders, customers, inventory, marketing - manages its own data pipeline, quality, and governance. Dataplex is GCP's service for implementing this pattern, providing the organizational structure, access control, and governance layer that makes data mesh practical.

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

### Documenting Data Products with Data Catalog

```bash
# Add rich metadata to a data product table using Data Catalog tags

# First, create a tag template for data products
gcloud data-catalog tag-templates create data-product-template \
  --location=us-central1 \
  --display-name="Data Product Metadata" \
  --field=id=owner_team,type=string,display-name="Owner Team",required=true \
  --field=id=sla_freshness_hours,type=double,display-name="Freshness SLA (hours)",required=true \
  --field=id=quality_score,type=double,display-name="Data Quality Score (0-100)" \
  --field=id=update_frequency,type=string,display-name="Update Frequency" \
  --field=id=pii_contains,type=bool,display-name="Contains PII"
```

Apply the tag to a data product:

```python
# Python: Tag a BigQuery table as a data product with metadata
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# Look up the Data Catalog entry for the BigQuery table
resource_name = (
    "//bigquery.googleapis.com/projects/my-project"
    "/datasets/orders_products/tables/order_summary"
)
entry = client.lookup_entry(
    request={"linked_resource": resource_name}
)

# Create a tag with data product metadata
tag = datacatalog_v1.Tag()
tag.template = (
    "projects/my-project/locations/us-central1"
    "/tagTemplates/data-product-template"
)
tag.fields = {
    "owner_team": datacatalog_v1.TagField(string_value="orders-engineering"),
    "sla_freshness_hours": datacatalog_v1.TagField(double_value=6.0),
    "quality_score": datacatalog_v1.TagField(double_value=98.5),
    "update_frequency": datacatalog_v1.TagField(string_value="hourly"),
    "pii_contains": datacatalog_v1.TagField(bool_value=False),
}

client.create_tag(parent=entry.name, tag=tag)
print(f"Tagged {entry.display_name} as a data product")
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

# Grant BigQuery Data Owner on their datasets
gcloud projects add-iam-policy-binding my-project \
  --member="group:orders-team@company.com" \
  --role="roles/bigquery.dataOwner" \
  --condition="expression=resource.name.startsWith('projects/my-project/datasets/orders_'),title=orders-datasets-only"

# Grant read access to other domains' data products (not raw data)
# The Marketing team can read Orders data products
gcloud dataplex zones add-iam-policy-binding orders-curated \
  --lake=orders-domain \
  --location=us-central1 \
  --member="group:marketing-team@company.com" \
  --role="roles/dataplex.dataReader"
```

## Federated Governance with Data Quality Rules

Dataplex supports data quality rules that domain teams define and manage for their own data products:

```yaml
# data_quality_rules.yaml
# Each domain team maintains their own quality rules
# These are enforced by Dataplex data quality tasks

rules:
  - rule_type: NOT_NULL
    column: order_id
    dimension: completeness
    threshold: 1.0           # 100% of values must be non-null

  - rule_type: UNIQUENESS
    column: order_id
    dimension: uniqueness
    threshold: 1.0

  - rule_type: RANGE
    column: total_amount
    dimension: accuracy
    min_value: 0
    threshold: 0.999         # 99.9% of values must be in range

  - rule_type: FRESHNESS
    column: order_timestamp
    dimension: timeliness
    max_staleness_hours: 6   # Data must be no more than 6 hours old

  - rule_type: ROW_COUNT
    dimension: completeness
    min_count: 1000          # Table must have at least 1000 rows
```

```bash
# Create a Dataplex data quality task that runs these rules
gcloud dataplex tasks create orders-quality-check \
  --lake=orders-domain \
  --location=us-central1 \
  --trigger-type=RECURRING \
  --trigger-schedule="0 * * * *" \
  --spark-main-class="com.google.cloud.dataplex.DataQualityTask" \
  --spark-file-uris="gs://my-config-bucket/data_quality_rules.yaml"
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

Teams need to find data products from other domains. Dataplex and Data Catalog provide search capabilities:

```bash
# Search for data products across all domains
gcloud data-catalog search \
  --include-project-ids=my-project \
  --scope=include-all \
  "tag:data-product-template.owner_team=*"

# Search for data products containing customer data
gcloud data-catalog search \
  --include-project-ids=my-project \
  "column:customer_id type:table"
```

## Wrapping Up

Data mesh on GCP with Dataplex provides a structured way to scale data ownership across teams. Dataplex lakes map to business domains, zones separate raw from curated data, and IAM policies enforce domain-level access control. Data Catalog tags document data products with ownership, SLAs, and quality scores. The shared infrastructure layer - dbt templates, quality frameworks, and governance policies - gives domain teams the tools they need to be self-sufficient. The result is an architecture where domain teams move fast independently while maintaining the governance and discoverability that the organization needs.
