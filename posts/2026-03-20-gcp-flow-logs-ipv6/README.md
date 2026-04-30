# How to Monitor IPv6 Traffic on GCP with Flow Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Flow Logs, VPC, Monitoring, Google Cloud, BigQuery

Description: Enable and analyze VPC Flow Logs for IPv6 traffic in Google Cloud, filter IPv6 connections in Cloud Logging, and export flow log data to BigQuery for IPv6 traffic analysis.

## Introduction

GCP VPC Flow Logs capture network traffic metadata for VMs in a subnet, including IPv6 connections. Flow logs record source and destination IP addresses (both IPv4 and IPv6), ports, bytes transferred, and connection direction. Enabling flow logs on a subnet with IPv6 traffic automatically captures IPv6 flow records. You can filter for IPv6 traffic in Cloud Logging using a regular expression that matches the colon pattern in IPv6 addresses.

## Enable Flow Logs with IPv6 Capture

```bash
PROJECT="my-project"
REGION="us-east1"

# Enable flow logs on an existing subnet

gcloud compute networks subnets update subnet-web \
    --project="$PROJECT" \
    --region="$REGION" \
    --enable-flow-logs \
    --logging-aggregation-interval=interval-5-min \
    --logging-flow-sampling=1.0 \
    --logging-metadata=include-all

# Enable flow logs when creating a new subnet
gcloud compute networks subnets create subnet-app-logged \
    --project="$PROJECT" \
    --network=vpc-main \
    --region="$REGION" \
    --range=10.0.4.0/24 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=EXTERNAL \
    --enable-flow-logs \
    --logging-aggregation-interval=interval-5-min \
    --logging-flow-sampling=0.5 \
    --logging-metadata=include-all

# Verify flow logs are enabled
gcloud compute networks subnets describe subnet-web \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="json(enableFlowLogs, logConfig)"
```

## Query IPv6 Flow Logs in Cloud Logging

```bash
# Use gcloud to query flow logs for IPv6 traffic
# IPv6 addresses contain colons - filter on that pattern

gcloud logging read \
    "resource.type=\"gce_subnetwork\" AND
     logName=\"projects/$PROJECT/logs/compute.googleapis.com%2Fvpc_flows\" AND
     (jsonPayload.connection.dest_ip =~ \":\" OR
      jsonPayload.connection.src_ip =~ \":\")" \
    --project="$PROJECT" \
    --limit=100 \
    --format="json"

# Filter specific IPv6 source
gcloud logging read \
    "resource.type=\"gce_subnetwork\" AND
     logName=\"projects/$PROJECT/logs/compute.googleapis.com%2Fvpc_flows\" AND
     jsonPayload.connection.src_ip=\"2600:1900:4000:abc1:8000::\"" \
    --project="$PROJECT" \
    --limit=50

# Filter by destination port 443 over IPv6
gcloud logging read \
    "resource.type=\"gce_subnetwork\" AND
     logName=\"projects/$PROJECT/logs/compute.googleapis.com%2Fvpc_flows\" AND
     jsonPayload.connection.dest_port=443 AND
     jsonPayload.connection.dest_ip =~ \":\"" \
    --project="$PROJECT" \
    --limit=50 \
    --format="table(jsonPayload.connection.src_ip, jsonPayload.connection.dest_ip, jsonPayload.bytes_sent)"
```

## Cloud Logging Query Syntax (Log Explorer)

```text
# In Cloud Console Log Explorer, use these queries:

# All IPv6 flow logs (source or destination is IPv6)
resource.type="gce_subnetwork"
logName="projects/PROJECT_ID/logs/compute.googleapis.com%2Fvpc_flows"
(jsonPayload.connection.src_ip =~ ":" OR jsonPayload.connection.dest_ip =~ ":")

# IPv6 connections on port 443
resource.type="gce_subnetwork"
logName="projects/PROJECT_ID/logs/compute.googleapis.com%2Fvpc_flows"
jsonPayload.connection.dest_port=443
jsonPayload.connection.dest_ip =~ ":"

# Top IPv6 source addresses (run as aggregated query)
resource.type="gce_subnetwork"
logName="projects/PROJECT_ID/logs/compute.googleapis.com%2Fvpc_flows"
jsonPayload.connection.src_ip =~ ":"

# IPv6 flows reported by the source endpoint
resource.type="gce_subnetwork"
logName="projects/PROJECT_ID/logs/compute.googleapis.com%2Fvpc_flows"
jsonPayload.connection.src_ip =~ ":"
jsonPayload.reporter="SRC"
```

## Export Flow Logs to BigQuery for Analysis

```bash
# Create BigQuery dataset
bq --project_id="$PROJECT" mk --dataset flow_logs_dataset

# Create log sink to export to BigQuery
gcloud logging sinks create flow-logs-bq-sink \
    bigquery.googleapis.com/projects/$PROJECT/datasets/flow_logs_dataset \
    --log-filter="resource.type=\"gce_subnetwork\" AND logName=\"projects/$PROJECT/logs/compute.googleapis.com%2Fvpc_flows\"" \
    --project="$PROJECT"

# Grant BigQuery write permission to sink service account
SINK_SA=$(gcloud logging sinks describe flow-logs-bq-sink \
    --project="$PROJECT" \
    --format="get(writerIdentity)")

gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="$SINK_SA" \
    --role=roles/bigquery.dataEditor
```

## BigQuery Queries for IPv6 Analysis

```sql
-- All IPv6 connections in the last 24 hours
SELECT
  jsonPayload.connection.src_ip AS src_ip,
  jsonPayload.connection.dest_ip AS dest_ip,
  jsonPayload.connection.dest_port AS dest_port,
  SUM(CAST(jsonPayload.bytes_sent AS INT64)) AS total_bytes,
  COUNT(*) AS flow_count
FROM `project.flow_logs_dataset.compute_googleapis_com_vpc_flows_*`
WHERE
  _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND (
    REGEXP_CONTAINS(jsonPayload.connection.src_ip, r':') OR
    REGEXP_CONTAINS(jsonPayload.connection.dest_ip, r':')
  )
GROUP BY src_ip, dest_ip, dest_port
ORDER BY total_bytes DESC
LIMIT 100;

-- IPv6 traffic by protocol
SELECT
  jsonPayload.connection.protocol AS protocol,
  COUNT(*) AS connections,
  SUM(CAST(jsonPayload.bytes_sent AS INT64)) AS bytes
FROM `project.flow_logs_dataset.compute_googleapis_com_vpc_flows_*`
WHERE
  _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND REGEXP_CONTAINS(jsonPayload.connection.src_ip, r':')
GROUP BY protocol
ORDER BY bytes DESC;
```

## Terraform: Subnet with Flow Logs

```hcl
resource "google_compute_subnetwork" "web" {
  name          = "subnet-web"
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id
  project       = var.project_id

  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "EXTERNAL"

  log_config {
    aggregation_interval = "INTERVAL_5_MIN"
    flow_sampling        = 1.0
    metadata             = "INCLUDE_ALL_METADATA"
  }
}
```

## Conclusion

GCP VPC Flow Logs automatically capture IPv6 traffic when flow logs are enabled on a dual-stack subnet. IPv6 connections appear in flow log records with IPv6 addresses in `src_ip` and `dest_ip` fields. Filter for IPv6 in Cloud Logging using regex `=~ ":"` to match the colon pattern in IPv6 addresses. Export flow logs to BigQuery using a log sink and use SQL with `REGEXP_CONTAINS(ip, r':')` for IPv6 traffic analysis. Set `flow_sampling = 1.0` when you want to retain all flow logs generated by the primary sampler, but remember that VPC Flow Logs still applies primary sampling.
