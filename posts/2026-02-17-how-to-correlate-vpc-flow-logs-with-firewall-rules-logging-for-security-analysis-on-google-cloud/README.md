# How to Correlate VPC Flow Logs with Firewall Rules Logging for Security Analysis on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Flow Logs, Firewall Rules, Security Analysis, Cloud Logging, Google Cloud

Description: Combine VPC Flow Logs with Firewall Rules Logging on Google Cloud to gain deep visibility into network traffic patterns and security policy enforcement.

---

VPC Flow Logs and Firewall Rules Logging are two separate but complementary data sources on Google Cloud. Flow logs tell you what traffic is happening on your network - source, destination, ports, bytes, and packets. Firewall rules logging tells you why traffic was allowed or denied - which specific rule matched and what action was taken. Correlating the two gives you a complete picture of network activity and security policy enforcement.

This guide shows you how to enable both log sources, join them for analysis, and build queries that answer real security questions.

## Enabling VPC Flow Logs

VPC Flow Logs capture a sample of network flows to and from VM instances. Enable them on the subnets you want to monitor.

```bash
# Enable VPC Flow Logs on a subnet with full sampling
gcloud compute networks subnets update my-subnet \
  --region=us-central1 \
  --enable-flow-logs \
  --logging-aggregation-interval=INTERVAL_5_SEC \
  --logging-flow-sampling=1.0 \
  --logging-metadata=include-all \
  --project=my-project
```

The `--logging-flow-sampling=1.0` captures every flow, which is ideal for security analysis but generates more data. For cost-sensitive environments, reduce this to 0.5 or lower.

The `--logging-metadata=include-all` includes VM metadata like instance names, zones, and project IDs in the log entries. This makes correlation much easier.

## Enabling Firewall Rules Logging

Enable logging on the specific firewall rules you want to monitor.

```bash
# Enable logging on an existing firewall rule
gcloud compute firewall-rules update allow-web-traffic \
  --enable-logging \
  --logging-metadata=include-all \
  --project=my-project

# Enable logging on a deny rule (especially important for security analysis)
gcloud compute firewall-rules update deny-all-ingress \
  --enable-logging \
  --logging-metadata=include-all \
  --project=my-project

# Create a new firewall rule with logging enabled from the start
gcloud compute firewall-rules create allow-internal \
  --network=my-vpc \
  --direction=INGRESS \
  --source-ranges=10.0.0.0/8 \
  --allow=tcp,udp,icmp \
  --enable-logging \
  --logging-metadata=include-all \
  --project=my-project
```

## Understanding the Log Formats

### VPC Flow Log Entry

Each flow log entry contains connection details but does not tell you why the traffic was allowed or denied.

```json
{
  "connection": {
    "src_ip": "10.0.1.5",
    "src_port": 52431,
    "dest_ip": "10.0.2.10",
    "dest_port": 8080,
    "protocol": 6
  },
  "src_instance": {
    "vm_name": "web-server-01",
    "zone": "us-central1-a",
    "project_id": "my-project"
  },
  "dest_instance": {
    "vm_name": "api-server-01",
    "zone": "us-central1-b",
    "project_id": "my-project"
  },
  "bytes_sent": 15234,
  "packets_sent": 42,
  "start_time": "2026-02-17T10:30:00Z",
  "end_time": "2026-02-17T10:30:05Z"
}
```

### Firewall Rules Log Entry

Each firewall log entry tells you which rule matched and the action taken.

```json
{
  "connection": {
    "src_ip": "10.0.1.5",
    "src_port": 52431,
    "dest_ip": "10.0.2.10",
    "dest_port": 8080,
    "protocol": 6
  },
  "disposition": "ALLOWED",
  "rule_details": {
    "reference": "network:my-vpc/firewall:allow-internal",
    "direction": "INGRESS",
    "priority": 1000,
    "action": "ALLOW",
    "source_range": ["10.0.0.0/8"],
    "ip_port_info": [
      {
        "ip_protocol": "TCP"
      }
    ]
  },
  "instance": {
    "vm_name": "api-server-01",
    "zone": "us-central1-b"
  }
}
```

## Correlating Logs in Cloud Logging

Use Cloud Logging queries to join flow logs and firewall logs based on their connection tuples.

### Find All Denied Traffic with Flow Context

```
# Query to find denied connections and their corresponding flow details
resource.type="gce_subnetwork"
logName="projects/my-project/logs/compute.googleapis.com%2Ffirewall"
jsonPayload.disposition="DENIED"
```

### Find Suspicious Traffic Patterns

Look for traffic that was allowed but might indicate lateral movement.

```
# Find allowed SSH connections between non-bastion hosts
resource.type="gce_subnetwork"
logName="projects/my-project/logs/compute.googleapis.com%2Ffirewall"
jsonPayload.disposition="ALLOWED"
jsonPayload.connection.dest_port=22
NOT jsonPayload.connection.src_ip="10.0.0.5"
```

### Correlate High-Volume Flows with Firewall Decisions

```
# Find high-bandwidth flows and cross-reference with firewall rules
resource.type="gce_subnetwork"
logName="projects/my-project/logs/compute.googleapis.com%2Fvpc_flows"
jsonPayload.bytes_sent > 1000000
```

## Advanced Correlation with BigQuery

For serious analysis, export both log types to BigQuery where you can run SQL joins.

### Set Up Log Sinks to BigQuery

```bash
# Create a BigQuery dataset for network logs
bq mk --dataset --location=US my-project:network_security_logs

# Create a log sink for VPC Flow Logs
gcloud logging sinks create flow-logs-to-bq \
  bigquery.googleapis.com/projects/my-project/datasets/network_security_logs \
  --log-filter='resource.type="gce_subnetwork" AND logName:"vpc_flows"' \
  --project=my-project

# Create a log sink for Firewall Rules Logs
gcloud logging sinks create firewall-logs-to-bq \
  bigquery.googleapis.com/projects/my-project/datasets/network_security_logs \
  --log-filter='resource.type="gce_subnetwork" AND logName:"firewall"' \
  --project=my-project

# Grant the sink writer identities access to the BigQuery dataset
FLOW_WRITER=$(gcloud logging sinks describe flow-logs-to-bq --project=my-project --format='value(writerIdentity)')
FIREWALL_WRITER=$(gcloud logging sinks describe firewall-logs-to-bq --project=my-project --format='value(writerIdentity)')

bq add-iam-policy-binding --member="${FLOW_WRITER}" --role=roles/bigquery.dataEditor my-project:network_security_logs
bq add-iam-policy-binding --member="${FIREWALL_WRITER}" --role=roles/bigquery.dataEditor my-project:network_security_logs
```

### SQL Queries for Security Analysis

Once data flows into BigQuery, you can run correlation queries.

```sql
-- Find all connections that were denied by firewall rules
-- and show the volume of denied traffic per source
SELECT
  fw.jsonPayload.connection.src_ip AS source_ip,
  fw.jsonPayload.connection.dest_ip AS dest_ip,
  fw.jsonPayload.connection.dest_port AS dest_port,
  fw.jsonPayload.rule_details.reference AS firewall_rule,
  COUNT(*) AS denied_count,
  MIN(fw.timestamp) AS first_seen,
  MAX(fw.timestamp) AS last_seen
FROM
  `my-project.network_security_logs.compute_googleapis_com_firewall_*` AS fw
WHERE
  fw.jsonPayload.disposition = 'DENIED'
  AND fw._TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
GROUP BY
  source_ip, dest_ip, dest_port, firewall_rule
ORDER BY
  denied_count DESC
LIMIT 100
```

```sql
-- Correlate flow logs with firewall decisions to find allowed connections
-- that transferred large amounts of data to unexpected destinations
SELECT
  fl.jsonPayload.connection.src_ip AS source_ip,
  fl.jsonPayload.src_instance.vm_name AS source_vm,
  fl.jsonPayload.connection.dest_ip AS dest_ip,
  fl.jsonPayload.dest_instance.vm_name AS dest_vm,
  fl.jsonPayload.connection.dest_port AS dest_port,
  SUM(CAST(fl.jsonPayload.bytes_sent AS INT64)) AS total_bytes,
  fw.jsonPayload.rule_details.reference AS matched_rule
FROM
  `my-project.network_security_logs.compute_googleapis_com_vpc_flows_*` AS fl
LEFT JOIN
  `my-project.network_security_logs.compute_googleapis_com_firewall_*` AS fw
ON
  fl.jsonPayload.connection.src_ip = fw.jsonPayload.connection.src_ip
  AND fl.jsonPayload.connection.dest_ip = fw.jsonPayload.connection.dest_ip
  AND fl.jsonPayload.connection.dest_port = fw.jsonPayload.connection.dest_port
WHERE
  fl._TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  AND fw.jsonPayload.disposition = 'ALLOWED'
GROUP BY
  source_ip, source_vm, dest_ip, dest_vm, dest_port, matched_rule
HAVING
  total_bytes > 100000000  -- More than 100MB
ORDER BY
  total_bytes DESC
```

```sql
-- Detect potential port scanning by looking for many denied connections
-- from a single source to different ports
SELECT
  jsonPayload.connection.src_ip AS scanner_ip,
  jsonPayload.connection.dest_ip AS target_ip,
  COUNT(DISTINCT jsonPayload.connection.dest_port) AS unique_ports_scanned,
  ARRAY_AGG(DISTINCT jsonPayload.connection.dest_port ORDER BY jsonPayload.connection.dest_port LIMIT 20) AS sampled_ports
FROM
  `my-project.network_security_logs.compute_googleapis_com_firewall_*`
WHERE
  jsonPayload.disposition = 'DENIED'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
GROUP BY
  scanner_ip, target_ip
HAVING
  unique_ports_scanned > 10
ORDER BY
  unique_ports_scanned DESC
```

## Automating Alerting

Create Cloud Monitoring alerts based on log-based metrics for real-time detection.

```bash
# Create a log-based metric for denied connection spikes
gcloud logging metrics create denied-connections-spike \
  --description="Count of firewall denied connections" \
  --log-filter='resource.type="gce_subnetwork" AND logName:"firewall" AND jsonPayload.disposition="DENIED"' \
  --project=my-project

# Create an alert policy on this metric
gcloud alpha monitoring policies create \
  --display-name="High Rate of Denied Connections" \
  --condition-display-name="Denied connections spike" \
  --condition-filter='metric.type="logging.googleapis.com/user/denied-connections-spike"' \
  --condition-threshold-value=100 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --project=my-project
```

## Cost Management

Both VPC Flow Logs and Firewall Rules Logging generate significant volume. For cost-conscious setups, enable flow logs only on sensitive subnets, use sampling rates below 1.0 for high-traffic subnets, enable firewall logging only on rules that matter for security (deny rules and rules protecting sensitive resources), and use log exclusion filters to drop known-benign traffic from Cloud Logging.

Correlating VPC Flow Logs with Firewall Rules Logging gives you the network visibility that security analysis demands. Flow logs tell you what happened, firewall logs tell you why, and BigQuery lets you analyze them together at scale.
