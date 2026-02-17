# How to Export VPC Flow Logs to BigQuery for Long-Term Network Analysis on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Flow Logs, BigQuery, Network Analysis, Cloud Logging, Google Cloud

Description: Set up a pipeline to export VPC Flow Logs to BigQuery for long-term retention, historical network analysis, and cost optimization on Google Cloud.

---

VPC Flow Logs in Cloud Logging are great for real-time troubleshooting, but Cloud Logging has retention limits and gets expensive at scale. If you need to analyze network traffic patterns over weeks or months - for capacity planning, security investigations, cost optimization, or compliance - BigQuery is the right destination. It gives you SQL-based analysis, scales to petabytes, and costs a fraction of what Cloud Logging charges for the same retention period.

This guide covers setting up the export pipeline, optimizing the BigQuery table structure, and running practical analysis queries.

## Enabling VPC Flow Logs

First, make sure flow logs are enabled on the subnets you want to analyze.

```bash
# Enable flow logs on a subnet with metadata included
gcloud compute networks subnets update production-subnet \
  --region=us-central1 \
  --enable-flow-logs \
  --logging-aggregation-interval=INTERVAL_10_MIN \
  --logging-flow-sampling=0.5 \
  --logging-metadata=include-all \
  --project=my-project
```

For long-term analysis, a sampling rate of 0.5 (50%) gives you enough data for statistical accuracy while cutting log volume in half. The 10-minute aggregation interval reduces the number of log entries while still providing useful granularity.

## Setting Up the BigQuery Export

### Create a BigQuery Dataset

```bash
# Create a dataset for network flow logs
# Use the same region as your VPC for lower export latency
bq mk \
  --dataset \
  --location=US \
  --default_table_expiration=0 \
  --description="VPC Flow Logs for network analysis" \
  my-project:vpc_flow_logs
```

### Create a Log Sink

Route VPC Flow Logs from Cloud Logging to BigQuery using a log sink.

```bash
# Create a log sink that exports VPC flow logs to BigQuery
gcloud logging sinks create vpc-flows-to-bigquery \
  bigquery.googleapis.com/projects/my-project/datasets/vpc_flow_logs \
  --log-filter='resource.type="gce_subnetwork" AND logName="projects/my-project/logs/compute.googleapis.com%2Fvpc_flows"' \
  --use-partitioned-tables \
  --project=my-project
```

The `--use-partitioned-tables` flag is important. It creates date-partitioned tables, which dramatically reduces query costs since BigQuery only scans the partitions you specify.

### Grant Write Access

The log sink creates a service account that needs write access to the BigQuery dataset.

```bash
# Get the sink's writer identity
WRITER_IDENTITY=$(gcloud logging sinks describe vpc-flows-to-bigquery \
  --project=my-project \
  --format='value(writerIdentity)')

echo "Writer identity: ${WRITER_IDENTITY}"

# Grant BigQuery data editor access to the dataset
bq add-iam-policy-binding \
  --member="${WRITER_IDENTITY}" \
  --role=roles/bigquery.dataEditor \
  my-project:vpc_flow_logs
```

## Verifying Data Flow

After a few minutes, check that data is arriving in BigQuery.

```bash
# List tables created in the dataset
bq ls my-project:vpc_flow_logs

# Count recent records
bq query --use_legacy_sql=false '
  SELECT COUNT(*) as record_count
  FROM `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows_*`
  WHERE _TABLE_SUFFIX >= FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
'
```

## Optimizing the Table Structure

The raw export creates tables with nested JSON fields. For frequently used queries, create a materialized view or scheduled query that flattens the data.

```sql
-- Create a flattened view for easier querying
-- This extracts the most commonly used fields from the nested JSON structure
CREATE OR REPLACE VIEW `my-project.vpc_flow_logs.flows_flat` AS
SELECT
  timestamp,
  jsonPayload.connection.src_ip AS src_ip,
  jsonPayload.connection.src_port AS src_port,
  jsonPayload.connection.dest_ip AS dest_ip,
  jsonPayload.connection.dest_port AS dest_port,
  jsonPayload.connection.protocol AS protocol,
  CAST(jsonPayload.bytes_sent AS INT64) AS bytes_sent,
  CAST(jsonPayload.packets_sent AS INT64) AS packets_sent,
  jsonPayload.src_instance.vm_name AS src_vm,
  jsonPayload.src_instance.zone AS src_zone,
  jsonPayload.src_instance.project_id AS src_project,
  jsonPayload.dest_instance.vm_name AS dest_vm,
  jsonPayload.dest_instance.zone AS dest_zone,
  jsonPayload.dest_instance.project_id AS dest_project,
  jsonPayload.src_vpc.vpc_name AS src_vpc,
  jsonPayload.dest_vpc.vpc_name AS dest_vpc,
  jsonPayload.src_location.country AS src_country,
  jsonPayload.dest_location.country AS dest_country,
  resource.labels.subnetwork_name AS subnet
FROM
  `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows_*`
```

## Practical Analysis Queries

### Top Talkers by Bandwidth

Find which VMs generate the most traffic.

```sql
-- Top 20 VMs by total bytes sent in the last 7 days
SELECT
  src_vm,
  src_ip,
  SUM(bytes_sent) AS total_bytes,
  ROUND(SUM(bytes_sent) / 1073741824, 2) AS total_gb,
  COUNT(*) AS flow_count
FROM
  `my-project.vpc_flow_logs.flows_flat`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND src_vm IS NOT NULL
GROUP BY
  src_vm, src_ip
ORDER BY
  total_bytes DESC
LIMIT 20
```

### Cross-Region Traffic Analysis

Identify traffic that crosses regions, which incurs higher network costs.

```sql
-- Cross-region traffic that could be optimized for cost
SELECT
  src_zone,
  dest_zone,
  COUNT(*) AS flow_count,
  SUM(bytes_sent) AS total_bytes,
  ROUND(SUM(bytes_sent) / 1073741824, 2) AS total_gb
FROM
  `my-project.vpc_flow_logs.flows_flat`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND src_zone IS NOT NULL
  AND dest_zone IS NOT NULL
  -- Different regions (compare the region prefix)
  AND SPLIT(src_zone, '-')[OFFSET(0)] || '-' || SPLIT(src_zone, '-')[OFFSET(1)]
    != SPLIT(dest_zone, '-')[OFFSET(0)] || '-' || SPLIT(dest_zone, '-')[OFFSET(1)]
GROUP BY
  src_zone, dest_zone
ORDER BY
  total_bytes DESC
```

### Internet Egress Analysis

Find traffic leaving your VPC to the internet, which is the most expensive network traffic on GCP.

```sql
-- Internet egress traffic analysis
-- Flows where the destination is not a private IP
SELECT
  src_vm,
  src_ip,
  dest_ip,
  dest_port,
  dest_country,
  SUM(bytes_sent) AS total_bytes,
  ROUND(SUM(bytes_sent) / 1073741824, 2) AS total_gb,
  COUNT(*) AS flow_count
FROM
  `my-project.vpc_flow_logs.flows_flat`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND dest_vm IS NULL  -- No destination VM means external traffic
  AND NOT STARTS_WITH(dest_ip, '10.')
  AND NOT STARTS_WITH(dest_ip, '172.16.')
  AND NOT STARTS_WITH(dest_ip, '192.168.')
GROUP BY
  src_vm, src_ip, dest_ip, dest_port, dest_country
ORDER BY
  total_bytes DESC
LIMIT 50
```

### Traffic Pattern Over Time

Understand your daily traffic pattern for capacity planning.

```sql
-- Hourly traffic volume over the past week
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  SUM(bytes_sent) AS total_bytes,
  ROUND(SUM(bytes_sent) / 1073741824, 2) AS total_gb,
  COUNT(*) AS flow_count,
  COUNT(DISTINCT src_ip) AS unique_sources,
  COUNT(DISTINCT dest_ip) AS unique_destinations
FROM
  `my-project.vpc_flow_logs.flows_flat`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  hour
ORDER BY
  hour
```

### Service Communication Map

Build a map of which services talk to which other services.

```sql
-- Service-to-service communication map
SELECT
  src_vm AS source_service,
  dest_vm AS destination_service,
  dest_port AS port,
  COUNT(*) AS connection_count,
  SUM(bytes_sent) AS total_bytes,
  MIN(timestamp) AS first_seen,
  MAX(timestamp) AS last_seen
FROM
  `my-project.vpc_flow_logs.flows_flat`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND src_vm IS NOT NULL
  AND dest_vm IS NOT NULL
GROUP BY
  source_service, destination_service, port
ORDER BY
  total_bytes DESC
```

## Setting Up Scheduled Reports

Create scheduled queries that generate regular reports.

```bash
# Create a scheduled query that generates a daily traffic summary
bq query --schedule="every 24 hours" \
  --display_name="Daily VPC Traffic Summary" \
  --destination_table="my-project:vpc_flow_logs.daily_summary" \
  --use_legacy_sql=false \
  --replace=true '
    SELECT
      CURRENT_DATE() AS report_date,
      COUNT(*) AS total_flows,
      SUM(CAST(jsonPayload.bytes_sent AS INT64)) AS total_bytes,
      COUNT(DISTINCT jsonPayload.connection.src_ip) AS unique_sources,
      COUNT(DISTINCT jsonPayload.connection.dest_ip) AS unique_destinations
    FROM
      `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows_*`
    WHERE
      _TABLE_SUFFIX = FORMAT_DATE("%Y%m%d", DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  '
```

## Cost Management

BigQuery storage costs are relatively low, but query costs can add up if you scan large amounts of data. Use these strategies to keep costs down.

Always filter by partition date. Without a date filter, BigQuery scans all partitions. Use clustered tables if you frequently filter by specific columns like src_ip or dest_ip. Set table expiration policies for data you do not need forever. Use materialized views for frequently run queries.

```bash
# Set default table expiration to 90 days for cost control
bq update --default_table_expiration=7776000 my-project:vpc_flow_logs
```

Exporting VPC Flow Logs to BigQuery gives you the ability to analyze network traffic over long time periods with the full power of SQL. Whether you are investigating security incidents, optimizing network costs, or planning capacity, having months of flow data at your fingertips changes how you approach network operations.
