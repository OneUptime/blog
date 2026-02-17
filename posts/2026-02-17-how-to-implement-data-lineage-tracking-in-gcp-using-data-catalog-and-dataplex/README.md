# How to Implement Data Lineage Tracking in GCP Using Data Catalog and Dataplex

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Data Catalog, Dataplex, Data Lineage, Data Governance

Description: Learn how to implement data lineage tracking in GCP using Data Catalog and Dataplex to visualize how data flows through your pipelines from source to consumption.

---

When something goes wrong with your data, the first question is always "where did this data come from?" Data lineage answers that question by mapping the flow of data from source systems through transformations to final consumption points. In GCP, Data Catalog and Dataplex provide the tools to track, visualize, and query this lineage automatically.

Without lineage, debugging a data issue means tracing through pipeline code, asking around, and piecing together the path manually. With lineage, you open a dashboard and see exactly which sources fed into a table, what transformations were applied, and which downstream assets are affected.

## Understanding Data Lineage in GCP

GCP captures data lineage at two levels:

**Automatic lineage**: BigQuery, Dataflow, Dataproc, and other GCP services automatically report lineage events when they read from or write to datasets. This happens without any configuration.

**Custom lineage**: For external systems, custom ETL jobs, or transformations that GCP cannot track automatically, you can report lineage events through the Data Lineage API.

The lineage data is stored in Data Catalog and can be explored through the Cloud Console, the Data Lineage API, or Dataplex's data governance features.

## Enabling Automatic Lineage

Automatic lineage capture is enabled by default for supported GCP services. The main services that report lineage are:

- BigQuery (queries, views, scheduled queries, CTAS operations)
- Dataflow (Apache Beam pipelines)
- Dataproc (Spark jobs)
- Cloud Data Fusion

To verify that lineage is being captured for your BigQuery tables:

```bash
# List lineage links for a specific BigQuery table
# This shows what data flows into and out of the table
gcloud data-lineage search-links \
  --project=my-project \
  --location=us \
  --target="bigquery:my-project.analytics.customer_orders"
```

## Viewing Lineage in the Console

The easiest way to explore lineage is through the BigQuery Console. Navigate to any table, click on the "Lineage" tab, and you see a visual graph showing:

- Upstream sources: tables, views, and external sources that feed into this table
- The current table
- Downstream consumers: tables, views, and reports that read from this table

The graph is interactive - you can click on any node to see its own lineage, effectively tracing the data path end to end.

## Using the Data Lineage API

For programmatic access, use the Data Lineage API. This is useful for building custom lineage dashboards, automated impact analysis, and integration with external governance tools.

### Querying Lineage Links

```python
# Python: Query lineage for a BigQuery table
from google.cloud import datacatalog_lineage_v1

client = datacatalog_lineage_v1.LineageClient()

# Define the target entity (the table you want lineage for)
target = datacatalog_lineage_v1.EntityReference()
target.fully_qualified_name = "bigquery:my-project.analytics.customer_orders"

# Search for all lineage links to/from this table
request = datacatalog_lineage_v1.SearchLinksRequest(
    parent="projects/my-project/locations/us",
    target=target
)

# List all lineage links
links = client.search_links(request=request)
for link in links:
    print(f"Source: {link.source.fully_qualified_name}")
    print(f"Target: {link.target.fully_qualified_name}")
    print(f"Start time: {link.start_time}")
    print("---")
```

### Getting Upstream Lineage (Where Does This Data Come From?)

```python
# Find all upstream sources for a table
def get_upstream_lineage(project, location, table_fqn, depth=3):
    """Recursively trace upstream lineage to a given depth."""
    client = datacatalog_lineage_v1.LineageClient()

    target = datacatalog_lineage_v1.EntityReference()
    target.fully_qualified_name = table_fqn

    request = datacatalog_lineage_v1.SearchLinksRequest(
        parent=f"projects/{project}/locations/{location}",
        target=target
    )

    upstream = []
    links = client.search_links(request=request)

    for link in links:
        source_fqn = link.source.fully_qualified_name
        upstream.append({
            'source': source_fqn,
            'target': table_fqn,
            'depth': 0
        })

        # Recursively get further upstream
        if depth > 1:
            further_upstream = get_upstream_lineage(
                project, location, source_fqn, depth - 1
            )
            for item in further_upstream:
                item['depth'] += 1
            upstream.extend(further_upstream)

    return upstream

# Trace lineage 3 levels deep
lineage = get_upstream_lineage(
    'my-project', 'us',
    'bigquery:my-project.analytics.customer_orders',
    depth=3
)

for item in lineage:
    indent = "  " * item['depth']
    print(f"{indent}Source: {item['source']}")
```

### Getting Downstream Lineage (What Does This Table Feed?)

```python
# Find all downstream consumers of a table
def get_downstream_lineage(project, location, table_fqn):
    """Find all tables and views that consume data from this table."""
    client = datacatalog_lineage_v1.LineageClient()

    source = datacatalog_lineage_v1.EntityReference()
    source.fully_qualified_name = table_fqn

    request = datacatalog_lineage_v1.SearchLinksRequest(
        parent=f"projects/{project}/locations/{location}",
        source=source
    )

    downstream = []
    links = client.search_links(request=request)

    for link in links:
        downstream.append(link.target.fully_qualified_name)

    return downstream

# Find what depends on the customers table
consumers = get_downstream_lineage(
    'my-project', 'us',
    'bigquery:my-project.raw_data.customers'
)

print("Tables that consume from raw_data.customers:")
for consumer in consumers:
    print(f"  - {consumer}")
```

## Reporting Custom Lineage

For transformations that run outside GCP's managed services (custom Python scripts, external ETL tools, data pulled from APIs), you need to report lineage manually.

### Creating a Custom Lineage Process

```python
# Report custom lineage for a Python ETL script
from google.cloud import datacatalog_lineage_v1
from google.protobuf import timestamp_pb2
import time

client = datacatalog_lineage_v1.LineageClient()
parent = "projects/my-project/locations/us"

# Step 1: Create a process (represents your ETL script or pipeline)
process = datacatalog_lineage_v1.Process()
process.display_name = "Customer Data Enrichment Script"
process.attributes = {
    "script": datacatalog_lineage_v1.types.AttributeValue(
        string_value="scripts/enrich_customers.py"
    ),
    "team": datacatalog_lineage_v1.types.AttributeValue(
        string_value="data-engineering"
    )
}

create_process_request = datacatalog_lineage_v1.CreateProcessRequest(
    parent=parent,
    process=process
)
created_process = client.create_process(request=create_process_request)
print(f"Created process: {created_process.name}")

# Step 2: Create a run (a specific execution of the process)
run = datacatalog_lineage_v1.Run()
run.display_name = "Daily enrichment run"
run.state = datacatalog_lineage_v1.Run.State.STARTED

start_time = timestamp_pb2.Timestamp()
start_time.GetCurrentTime()
run.start_time = start_time

create_run_request = datacatalog_lineage_v1.CreateRunRequest(
    parent=created_process.name,
    run=run
)
created_run = client.create_run(request=create_run_request)

# Step 3: Create lineage events (source -> target mappings)
event = datacatalog_lineage_v1.LineageEvent()

# Define source entities (what the script reads from)
source1 = datacatalog_lineage_v1.EventLink()
source1.source.fully_qualified_name = "bigquery:my-project.raw_data.customers"
source1.target.fully_qualified_name = "bigquery:my-project.analytics.enriched_customers"

source2 = datacatalog_lineage_v1.EventLink()
source2.source.fully_qualified_name = "bigquery:my-project.raw_data.customer_scores"
source2.target.fully_qualified_name = "bigquery:my-project.analytics.enriched_customers"

event.links = [source1, source2]
event.start_time = start_time

create_event_request = datacatalog_lineage_v1.CreateLineageEventRequest(
    parent=created_run.name,
    lineage_event=event
)
client.create_lineage_event(request=create_event_request)
```

## Lineage with Dataplex

Dataplex extends Data Catalog's lineage with data governance features. You can use Dataplex to organize your data assets into lakes and zones, and lineage flows through this organizational structure.

### Setting Up Dataplex for Lineage-Aware Governance

```bash
# Create a Dataplex lake for organizing data assets
gcloud dataplex lakes create analytics-lake \
  --location=us-central1 \
  --display-name="Analytics Data Lake"

# Create zones within the lake
gcloud dataplex zones create raw-zone \
  --lake=analytics-lake \
  --location=us-central1 \
  --resource-location-type=SINGLE_REGION \
  --type=RAW \
  --display-name="Raw Data Zone"

gcloud dataplex zones create curated-zone \
  --lake=analytics-lake \
  --location=us-central1 \
  --resource-location-type=SINGLE_REGION \
  --type=CURATED \
  --display-name="Curated Analytics Zone"

# Attach BigQuery datasets as assets
gcloud dataplex assets create raw-data-asset \
  --lake=analytics-lake \
  --zone=raw-zone \
  --location=us-central1 \
  --resource-type=BIGQUERY_DATASET \
  --resource-name="projects/my-project/datasets/raw_data" \
  --display-name="Raw Data Asset"
```

## Impact Analysis

One of the most valuable uses of lineage is impact analysis - determining what downstream assets are affected when you change a source table:

```python
# Impact analysis: what breaks if we change this table?
def impact_analysis(project, location, table_fqn, depth=5):
    """Find all downstream tables affected by changes to a source table."""
    visited = set()
    impacted = []

    def traverse(current_fqn, current_depth):
        if current_fqn in visited or current_depth > depth:
            return
        visited.add(current_fqn)

        downstream = get_downstream_lineage(project, location, current_fqn)
        for target in downstream:
            impacted.append({
                'table': target,
                'distance': current_depth
            })
            traverse(target, current_depth + 1)

    traverse(table_fqn, 1)
    return impacted

# What is affected if we change the raw customers table?
affected = impact_analysis(
    'my-project', 'us',
    'bigquery:my-project.raw_data.customers'
)

print("Impact analysis for raw_data.customers:")
for item in affected:
    print(f"  Level {item['distance']}: {item['table']}")
```

## Wrapping Up

Data lineage in GCP provides visibility into how data flows through your pipelines. Automatic lineage capture handles BigQuery, Dataflow, and Dataproc without any setup. The Data Lineage API lets you report lineage for custom transformations and query lineage programmatically. Dataplex adds organizational structure through lakes and zones. Together, these tools give you the ability to answer "where did this data come from?" and "what breaks if I change this?" - two questions that come up constantly in data engineering and that are nearly impossible to answer without lineage tracking.
