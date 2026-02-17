# How to Set Up VPC Flow Logs and Export Them to BigQuery for Analysis in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Flow Logs, BigQuery, Networking, Monitoring

Description: A practical guide to enabling VPC Flow Logs in GCP, exporting them to BigQuery for analysis, and writing queries to investigate network traffic patterns and security events.

---

VPC Flow Logs capture information about IP traffic going to and from network interfaces in your VPC. They are invaluable for network monitoring, forensics, security analysis, and troubleshooting connectivity issues. But the real power comes when you export them to BigQuery, where you can run SQL queries across millions of flow records to find patterns and anomalies.

In this post, I will walk through enabling flow logs, configuring the export pipeline to BigQuery, and writing practical queries for common analysis tasks.

## Enabling VPC Flow Logs

Flow logs are enabled at the subnet level. You can configure them when creating a subnet or update an existing one:

```bash
# Enable flow logs on an existing subnet with custom settings
gcloud compute networks subnets update prod-us-central1 \
  --region=us-central1 \
  --enable-flow-logs \
  --logging-aggregation-interval=INTERVAL_5_SEC \
  --logging-flow-sampling=0.5 \
  --logging-metadata=include-all \
  --logging-filter-expr='has(jsonPayload.src_instance) || has(jsonPayload.dest_instance)'
```

Here is what each option does:

- **aggregation-interval**: How frequently logs are aggregated. `INTERVAL_5_SEC` gives the most granular data. Options range from 5 seconds to 15 minutes.
- **flow-sampling**: What fraction of flows to log. `0.5` logs 50% of flows. Use `1.0` for complete visibility or lower values to reduce costs.
- **logging-metadata**: `include-all` captures source/destination instance names, zones, and other metadata. Without this, you only get IP addresses.
- **logging-filter-expr**: Optional filter to reduce log volume. This example only logs flows involving VM instances.

For a new subnet:

```bash
# Create a new subnet with flow logs enabled from the start
gcloud compute networks subnets create monitored-subnet \
  --network=production-vpc \
  --region=us-central1 \
  --range=10.10.0.0/20 \
  --enable-flow-logs \
  --logging-aggregation-interval=INTERVAL_10_SEC \
  --logging-flow-sampling=0.5 \
  --logging-metadata=include-all \
  --enable-private-ip-google-access
```

## Understanding Flow Log Records

Each flow log record contains:

- Source and destination IP addresses and ports
- Protocol (TCP, UDP, ICMP)
- Bytes and packets transferred
- Start and end timestamps
- Source and destination instance information (if metadata is included)
- Whether the traffic was allowed or denied by firewall rules

## Creating a BigQuery Dataset

Before exporting, create a BigQuery dataset to receive the logs:

```bash
# Create a BigQuery dataset for flow logs
bq mk --dataset \
  --description="VPC Flow Logs for network analysis" \
  --location=US \
  my-project:vpc_flow_logs
```

## Setting Up the Log Export

Create a log sink that routes VPC flow logs to BigQuery:

```bash
# Create a log sink to export VPC flow logs to BigQuery
gcloud logging sinks create vpc-flow-logs-to-bq \
  bigquery.googleapis.com/projects/my-project/datasets/vpc_flow_logs \
  --log-filter='resource.type="gce_subnetwork" AND logName:"compute.googleapis.com%2Fvpc_flows"' \
  --use-partitioned-tables
```

The `--use-partitioned-tables` flag creates time-partitioned tables, which makes queries faster and cheaper since BigQuery only scans the relevant partitions.

After creating the sink, grant the sink's service account write access to the BigQuery dataset:

```bash
# Get the sink's writer identity
WRITER_IDENTITY=$(gcloud logging sinks describe vpc-flow-logs-to-bq \
  --format="value(writerIdentity)")

# Grant BigQuery Data Editor role to the sink's service account
bq add-iam-policy-binding \
  --member="${WRITER_IDENTITY}" \
  --role=roles/bigquery.dataEditor \
  my-project:vpc_flow_logs
```

## Verifying the Export

After a few minutes, check that data is flowing into BigQuery:

```bash
# List tables in the dataset - you should see a flow logs table
bq ls vpc_flow_logs

# Query the most recent records
bq query --use_legacy_sql=false '
SELECT
  timestamp,
  jsonPayload.connection.src_ip,
  jsonPayload.connection.dest_ip,
  jsonPayload.connection.src_port,
  jsonPayload.connection.dest_port,
  jsonPayload.connection.protocol,
  jsonPayload.bytes_sent
FROM `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows`
ORDER BY timestamp DESC
LIMIT 10'
```

## Practical BigQuery Queries

Here are queries I use regularly for network analysis.

### Top Talkers by Bandwidth

Find the VM pairs generating the most traffic:

```sql
-- Find the top 20 source-destination pairs by total bytes transferred
SELECT
  jsonPayload.src_instance.vm_name AS source_vm,
  jsonPayload.dest_instance.vm_name AS dest_vm,
  jsonPayload.connection.protocol AS protocol,
  SUM(CAST(jsonPayload.bytes_sent AS INT64)) AS total_bytes,
  COUNT(*) AS flow_count
FROM `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY source_vm, dest_vm, protocol
ORDER BY total_bytes DESC
LIMIT 20
```

### Denied Traffic Analysis

Identify traffic being blocked by firewall rules:

```sql
-- Find all denied traffic in the last 24 hours, grouped by source
SELECT
  jsonPayload.connection.src_ip AS source_ip,
  jsonPayload.connection.dest_ip AS dest_ip,
  jsonPayload.connection.dest_port AS dest_port,
  jsonPayload.connection.protocol AS protocol,
  jsonPayload.disposition AS action,
  COUNT(*) AS attempt_count
FROM `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND jsonPayload.disposition = 'DENIED'
GROUP BY source_ip, dest_ip, dest_port, protocol, action
ORDER BY attempt_count DESC
LIMIT 50
```

### Traffic to External IPs

Monitor outbound traffic to the internet:

```sql
-- Find all traffic going to external (non-RFC1918) IP addresses
SELECT
  jsonPayload.src_instance.vm_name AS source_vm,
  jsonPayload.connection.dest_ip AS external_ip,
  jsonPayload.connection.dest_port AS dest_port,
  SUM(CAST(jsonPayload.bytes_sent AS INT64)) AS total_bytes,
  COUNT(*) AS connection_count
FROM `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND NOT (
    NET.IP_IN_NET(NET.IP_FROM_STRING(jsonPayload.connection.dest_ip), '10.0.0.0/8')
    OR NET.IP_IN_NET(NET.IP_FROM_STRING(jsonPayload.connection.dest_ip), '172.16.0.0/12')
    OR NET.IP_IN_NET(NET.IP_FROM_STRING(jsonPayload.connection.dest_ip), '192.168.0.0/16')
  )
GROUP BY source_vm, external_ip, dest_port
ORDER BY total_bytes DESC
LIMIT 50
```

### Port Scan Detection

Detect potential port scanning activity:

```sql
-- Find sources hitting many different ports on a single destination
-- This pattern often indicates port scanning
SELECT
  jsonPayload.connection.src_ip AS scanner_ip,
  jsonPayload.connection.dest_ip AS target_ip,
  COUNT(DISTINCT jsonPayload.connection.dest_port) AS unique_ports,
  MIN(timestamp) AS first_seen,
  MAX(timestamp) AS last_seen
FROM `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND jsonPayload.connection.protocol = 6  -- TCP
GROUP BY scanner_ip, target_ip
HAVING unique_ports > 20
ORDER BY unique_ports DESC
```

### Traffic by Subnet Over Time

Track bandwidth trends by subnet:

```sql
-- Hourly traffic volume by subnet for the past 7 days
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  jsonPayload.src_vpc.subnetwork_name AS subnet,
  SUM(CAST(jsonPayload.bytes_sent AS INT64)) / 1073741824 AS gb_transferred,
  COUNT(*) AS flow_count
FROM `my-project.vpc_flow_logs.compute_googleapis_com_vpc_flows`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY hour, subnet
ORDER BY hour DESC, gb_transferred DESC
```

## Cost Optimization

Flow logs can generate significant BigQuery storage costs. Here are ways to manage that:

```bash
# Set table expiration to automatically delete old data (90 days)
bq update --default_table_expiration=7776000 vpc_flow_logs
```

Reduce sampling rate for subnets where full visibility is not critical:

```bash
# Lower sampling rate on dev subnets to save costs
gcloud compute networks subnets update dev-subnet \
  --region=us-central1 \
  --logging-flow-sampling=0.1
```

Use filtering to exclude noisy internal traffic:

```bash
# Only log flows involving external IPs to reduce volume
gcloud compute networks subnets update prod-subnet \
  --region=us-central1 \
  --logging-filter-expr='!(has(jsonPayload.src_instance) && has(jsonPayload.dest_instance))'
```

## Wrapping Up

VPC Flow Logs combined with BigQuery give you a powerful network analysis platform. Enable flow logs on all production subnets, export to BigQuery with partitioned tables, and build a library of queries for your common analysis tasks. The data is there - you just need to ask the right questions. Start with the queries above and customize them for your environment. When the next connectivity issue or security incident happens, you will be glad you had flow logs running.
