# How to Use Data Catalog to Track Data Lineage Across BigQuery Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Data Catalog, BigQuery, Data Lineage, Data Governance, Google Cloud

Description: Learn how to use Google Cloud Data Catalog to track data lineage across your BigQuery pipelines for better governance and troubleshooting.

---

When you have dozens of BigQuery datasets feeding into each other through scheduled queries, Dataflow jobs, and Cloud Composer DAGs, figuring out where a particular column came from becomes a real challenge. That is exactly the problem Google Cloud's data lineage feature solves. It gives you a visual and queryable map of how data flows through your GCP environment.

I spent a good chunk of time setting this up for a production analytics platform, and this guide covers what I learned - from enabling the API to querying lineage programmatically.

## What Data Lineage Actually Tracks

Data lineage records three things: the source of data, the transformation that happened, and the destination. Each of these is captured as a lineage event whenever a supported GCP service processes data.

For BigQuery specifically, lineage is automatically captured for:

- Copy jobs
- Load jobs from Cloud Storage URIs
- CREATE TABLE, CREATE TABLE AS SELECT, CREATE VIEW, and CREATE MATERIALIZED VIEW statements
- SELECT statements that read from views, materialized views, or external tables
- INSERT SELECT, MERGE, UPDATE, and DELETE statements
- Dataflow pipelines writing to BigQuery
- Cloud Composer environments with data lineage integration enabled
- Dataproc Spark jobs with the data lineage integration enabled

The lineage graph connects datasets, tables, and even columns, so you can trace a single field back to its origin.

## Enabling Data Lineage

First, you need to enable the Data Lineage API in the projects where lineage is recorded. In the project where you view lineage, enable both the Data Lineage API and the Dataplex API.

```bash
# Enable the Data Lineage API for your project
gcloud services enable datalineage.googleapis.com --project=my-project-id

# Also enable Dataplex in the project where you view lineage
gcloud services enable dataplex.googleapis.com --project=my-project-id
```

You also need the right IAM permissions. Automatic lineage is captured after the API is enabled, but anyone viewing or querying lineage needs the data lineage viewer role, plus permissions to view the underlying assets and jobs. For BigQuery lineage, that usually means BigQuery Data Viewer on the table storage project and BigQuery Resource Viewer on the job compute project.

```bash
# Grant lineage viewer role to a user or group
gcloud projects add-iam-policy-binding my-project-id \
  --member="user:analyst@company.com" \
  --role="roles/datalineage.viewer"

# Grant lineage admin role if a service account creates custom lineage events
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:pipeline-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/datalineage.admin"
```

## Viewing Lineage in the Console

Once the API is enabled and your pipelines have run, you can see lineage directly in the BigQuery console. BigQuery lineage can take up to 24 hours to appear after a job completes. Navigate to any table, click the "Lineage" tab, and you will see a directed graph showing upstream and downstream dependencies.

The graph is interactive. You can click on any node to see details about the transformation, including the job ID, timestamp, and the SQL or pipeline configuration that produced it.

This is incredibly useful during incident response. If a dashboard shows wrong numbers, you can trace the data back through each transformation step to find where the issue was introduced.

## Querying Lineage Programmatically

The console view is great for exploration, but for automated governance checks, you want to query lineage through the API. Here is a Python example that retrieves lineage for a specific BigQuery table.

```python
from google.cloud import datacatalog_lineage_v1

def get_table_lineage(project_id, dataset_id, table_id):
    """Retrieve upstream lineage for a BigQuery table."""
    client = datacatalog_lineage_v1.LineageClient()

    # Build the fully qualified resource name for the BigQuery table
    target = f"//bigquery.googleapis.com/projects/{project_id}/datasets/{dataset_id}/tables/{table_id}"

    # Search for lineage links where this table is the target
    request = datacatalog_lineage_v1.SearchLinksRequest(
        parent=f"projects/{project_id}/locations/us",
        target=datacatalog_lineage_v1.EntityReference(
            fully_qualified_name=target
        ),
    )

    # Iterate through all lineage links
    links = list(client.search_links(request=request))
    for link in links:
        print(f"Source: {link.source.fully_qualified_name}")
        print(f"Target: {link.target.fully_qualified_name}")

        process_links = client.batch_search_link_processes(
            parent=f"projects/{project_id}/locations/us",
            links=[link.name],
        )
        for process_link in process_links:
            print(f"Process: {process_link.process}")
        print("---")

    return links

# Example usage
get_table_lineage("my-project", "analytics", "daily_revenue")
```

This returns every upstream source that feeds into the `daily_revenue` table, along with the lineage process that created the link.

## Tracking Column-Level Lineage

Table-level lineage tells you which tables feed into which, but column-level lineage is where the real value is. It answers questions like "where does the `total_revenue` column come from?" and "which downstream reports break if I rename this column?"

BigQuery captures column-level lineage automatically for supported SQL operations, including CREATE TABLE, CREATE TABLE COPY, INSERT, UPDATE, MERGE, DELETE, and SELECT queries with a destination table. In the console, you can open the Lineage tab and filter by column name or switch to the column-level graph or list view.

```python
def get_column_lineage(project_id, dataset_id, table_id, column_name):
    """Print the console filter to use for column-level lineage."""
    table = f"{project_id}.{dataset_id}.{table_id}"
    print(f"Open the Lineage tab for {table}")
    print(f"Filter the Lineage explorer panel by column name: {column_name}")
```

## Custom Lineage Events

Sometimes your pipelines run outside of GCP's built-in integrations. Maybe you have a Python script that reads from BigQuery, transforms data locally, and writes results back. In these cases, you can create custom lineage events.

```python
from google.cloud import datacatalog_lineage_v1

def create_custom_lineage(project_id, source_table, target_table):
    """Register a custom lineage event for a pipeline step."""
    client = datacatalog_lineage_v1.LineageClient()

    # Create a process that represents your pipeline
    process = datacatalog_lineage_v1.Process(
        display_name="custom-etl-pipeline",
        origin=datacatalog_lineage_v1.Origin(
            source_type=datacatalog_lineage_v1.Origin.SourceType.CUSTOM,
            name="my-etl-framework",
        ),
    )

    created_process = client.create_process(
        parent=f"projects/{project_id}/locations/us",
        process=process,
    )

    # Create a run within that process
    run = datacatalog_lineage_v1.Run(
        display_name="daily-run-2026-02-17",
        state=datacatalog_lineage_v1.Run.State.COMPLETED,
        start_time={"seconds": 1771286400},
        end_time={"seconds": 1771290000},
    )

    created_run = client.create_run(
        parent=created_process.name,
        run=run,
    )

    # Create the lineage event linking source to target
    event = datacatalog_lineage_v1.LineageEvent(
        start_time={"seconds": 1771286400},
        end_time={"seconds": 1771290000},
        links=[
            datacatalog_lineage_v1.EventLink(
                source=datacatalog_lineage_v1.EntityReference(
                    fully_qualified_name=source_table
                ),
                target=datacatalog_lineage_v1.EntityReference(
                    fully_qualified_name=target_table
                ),
            )
        ],
    )

    client.create_lineage_event(
        parent=created_run.name,
        lineage_event=event,
    )

    print(f"Lineage event created: {source_table} -> {target_table}")

# Register a custom lineage link
create_custom_lineage(
    "my-project",
    "//bigquery.googleapis.com/projects/my-project/datasets/raw/tables/events",
    "//bigquery.googleapis.com/projects/my-project/datasets/analytics/tables/user_sessions",
)
```

## Lineage and Impact Analysis

One of the most practical uses of lineage is impact analysis before making schema changes. Before you drop or rename a column, you can check what depends on it.

Here is how the flow looks in a typical analytics pipeline:

```mermaid
graph LR
    A[raw.events] --> B[staging.cleaned_events]
    A --> C[staging.session_events]
    B --> D[analytics.daily_metrics]
    C --> D
    D --> E[reporting.executive_dashboard]
    D --> F[reporting.team_metrics]
    B --> G[ml.training_features]
```

With lineage enabled, this graph is generated automatically. You do not have to maintain it manually or rely on documentation that goes stale.

## Retention and Limits

Lineage events are retained for 30 days. If you need longer retention for compliance, you should export lineage data to a separate BigQuery dataset on a schedule.

```python
from google.cloud import datacatalog_lineage_v1

def export_process_names(project_id, location="us"):
    """List lineage process names that a scheduled job can persist elsewhere."""
    client = datacatalog_lineage_v1.LineageClient()
    parent = f"projects/{project_id}/locations/{location}"

    for process in client.list_processes(parent=parent):
        print(process.name)
```

## Wrapping Up

Google Cloud data lineage turns your BigQuery pipelines from a black box into a transparent system where you can trace any piece of data back to its source. The automatic capture for BigQuery operations means you get value after enabling the API and rerunning supported jobs, and the custom lineage API lets you fill in the gaps for non-native pipelines.

The biggest win in my experience has been incident response. When a number looks wrong in a report, tracing it back through lineage to the root cause takes minutes instead of hours. If you are running any non-trivial data platform on GCP, enabling lineage is one of the highest-value, lowest-effort improvements you can make.
