# How to Enable and Analyze VPC Flow Logs for Network Traffic Forensics on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Flow Logs, Network Forensics, Security, Monitoring

Description: Learn how to enable VPC Flow Logs on Google Cloud and analyze them for network traffic forensics, security investigations, and troubleshooting connectivity issues.

---

When something goes wrong on your network - an unexpected data transfer, a failed connection, or a suspected breach - you need to know exactly what traffic flowed where and when. VPC Flow Logs on Google Cloud capture metadata about every network flow passing through your VPC subnets. They record source and destination IPs, ports, protocols, bytes transferred, and timestamps. This data is invaluable for security forensics, compliance auditing, and debugging network issues.

In this post, I will show you how to enable VPC Flow Logs, export them to BigQuery for analysis, and run forensic queries to investigate network activity.

## What VPC Flow Logs Capture

VPC Flow Logs record a sample of network flows at the VM network interface level. Each log entry contains:

- Source and destination IP addresses
- Source and destination ports
- Protocol (TCP, UDP, ICMP, etc.)
- Bytes and packets sent
- Start and end timestamps
- Whether the flow was allowed or denied by firewall rules
- VM instance details (name, zone, project)
- VPC and subnet information

Flow logs are aggregated over configurable intervals (5 seconds to 15 minutes) and sampled at a configurable rate.

## Step 1 - Enable VPC Flow Logs on a Subnet

You can enable flow logs on existing subnets without any downtime or disruption.

```bash
# Enable flow logs on an existing subnet with recommended settings
gcloud compute networks subnets update my-subnet \
    --region=us-central1 \
    --enable-flow-logs \
    --logging-aggregation-interval=INTERVAL_5_SEC \
    --logging-flow-sampling=1.0 \
    --logging-metadata=include-all \
    --logging-filter-expr=""
```

Let me explain the flags:

- `--logging-aggregation-interval=INTERVAL_5_SEC`: How often flows are aggregated. Shorter intervals give more granular data but generate more logs.
- `--logging-flow-sampling=1.0`: Sample rate from 0 to 1. A value of 1.0 captures all flows. For forensics, use 1.0 - you do not want to miss anything.
- `--logging-metadata=include-all`: Include all available metadata in the logs.

For production subnets where cost is a concern, you can reduce the sampling rate:

```bash
# Enable with 50% sampling for cost-conscious environments
gcloud compute networks subnets update prod-subnet \
    --region=us-central1 \
    --enable-flow-logs \
    --logging-aggregation-interval=INTERVAL_10_SEC \
    --logging-flow-sampling=0.5 \
    --logging-metadata=include-all
```

## Step 2 - Export Flow Logs to BigQuery

Flow logs are stored in Cloud Logging by default, but for forensic analysis, BigQuery is much more powerful. Set up a log sink to export flow logs to BigQuery.

```bash
# Create a BigQuery dataset for flow logs
bq mk --dataset --location=US my_project:vpc_flow_logs

# Create a log sink that exports VPC flow logs to BigQuery
gcloud logging sinks create flow-logs-to-bq \
    bigquery.googleapis.com/projects/my-project/datasets/vpc_flow_logs \
    --log-filter='resource.type="gce_subnetwork" AND logName:"compute.googleapis.com%2Fvpc_flows"'

# Get the sink's service account and grant it BigQuery write access
SINK_SA=$(gcloud logging sinks describe flow-logs-to-bq --format="value(writerIdentity)")

bq add-iam-policy-binding \
    --member="${SINK_SA}" \
    --role="roles/bigquery.dataEditor" \
    my_project:vpc_flow_logs
```

After creating the sink, flow logs will start appearing in BigQuery within a few minutes.

## Step 3 - Understanding the Log Schema

The BigQuery table has a nested schema. Here are the most important fields for forensics:

```sql
-- Key fields in the VPC flow logs table
-- jsonPayload.connection.src_ip     - Source IP address
-- jsonPayload.connection.dest_ip    - Destination IP address
-- jsonPayload.connection.src_port   - Source port
-- jsonPayload.connection.dest_port  - Destination port
-- jsonPayload.connection.protocol   - Protocol number (6=TCP, 17=UDP)
-- jsonPayload.bytes_sent            - Bytes in this flow
-- jsonPayload.packets_sent          - Packets in this flow
-- jsonPayload.start_time            - Flow start timestamp
-- jsonPayload.end_time              - Flow end timestamp
-- jsonPayload.src_instance          - Source VM details
-- jsonPayload.dest_instance         - Destination VM details
-- jsonPayload.disposition           - ALLOWED or DENIED
```

## Step 4 - Forensic Analysis Queries

Now for the interesting part. Here are queries you would run during a security investigation.

### Find All Traffic from a Suspicious IP

If you have identified a suspicious IP address, find all communication it had with your network:

```sql
-- Find all flows involving a specific IP address over the last 7 days
SELECT
    timestamp,
    jsonPayload.connection.src_ip AS src_ip,
    jsonPayload.connection.dest_ip AS dest_ip,
    jsonPayload.connection.src_port AS src_port,
    jsonPayload.connection.dest_port AS dest_port,
    jsonPayload.connection.protocol AS protocol,
    jsonPayload.bytes_sent AS bytes,
    jsonPayload.disposition AS disposition,
    jsonPayload.dest_instance.vm_name AS dest_vm
FROM
    `my_project.vpc_flow_logs.compute_googleapis_com_vpc_flows_*`
WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
    AND (
        jsonPayload.connection.src_ip = '203.0.113.50'
        OR jsonPayload.connection.dest_ip = '203.0.113.50'
    )
ORDER BY timestamp DESC
LIMIT 1000;
```

### Detect Large Data Transfers (Potential Exfiltration)

Look for unusually large data transfers that might indicate data exfiltration:

```sql
-- Find the top data transfers by volume in the last 24 hours
SELECT
    jsonPayload.connection.src_ip AS src_ip,
    jsonPayload.connection.dest_ip AS dest_ip,
    jsonPayload.connection.dest_port AS dest_port,
    jsonPayload.src_instance.vm_name AS src_vm,
    SUM(jsonPayload.bytes_sent) AS total_bytes,
    COUNT(*) AS flow_count,
    MIN(timestamp) AS first_seen,
    MAX(timestamp) AS last_seen
FROM
    `my_project.vpc_flow_logs.compute_googleapis_com_vpc_flows_*`
WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    -- Only egress to external IPs
    AND jsonPayload.connection.dest_ip NOT LIKE '10.%'
    AND jsonPayload.connection.dest_ip NOT LIKE '172.16.%'
    AND jsonPayload.connection.dest_ip NOT LIKE '192.168.%'
GROUP BY
    src_ip, dest_ip, dest_port, src_vm
HAVING
    total_bytes > 1073741824  -- More than 1 GB
ORDER BY
    total_bytes DESC;
```

### Find Denied Connection Attempts

Denied flows can indicate reconnaissance or misconfiguration:

```sql
-- Find firewall-denied flows grouped by source
SELECT
    jsonPayload.connection.src_ip AS src_ip,
    jsonPayload.connection.dest_port AS dest_port,
    jsonPayload.connection.protocol AS protocol,
    COUNT(*) AS denied_count,
    COUNT(DISTINCT jsonPayload.connection.dest_ip) AS unique_targets
FROM
    `my_project.vpc_flow_logs.compute_googleapis_com_vpc_flows_*`
WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    AND jsonPayload.disposition = 'DENIED'
GROUP BY
    src_ip, dest_port, protocol
HAVING
    denied_count > 100
ORDER BY
    denied_count DESC;
```

### Identify Connections to Unusual Ports

Services running on non-standard ports can be a red flag:

```sql
-- Find outbound connections to unusual ports
SELECT
    jsonPayload.connection.dest_port AS dest_port,
    jsonPayload.connection.dest_ip AS dest_ip,
    jsonPayload.src_instance.vm_name AS src_vm,
    COUNT(*) AS connection_count,
    SUM(jsonPayload.bytes_sent) AS total_bytes
FROM
    `my_project.vpc_flow_logs.compute_googleapis_com_vpc_flows_*`
WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    AND jsonPayload.connection.protocol = 6  -- TCP
    -- Exclude common ports
    AND jsonPayload.connection.dest_port NOT IN (80, 443, 22, 53, 8080, 8443, 3306, 5432)
    -- Only external destinations
    AND jsonPayload.connection.dest_ip NOT LIKE '10.%'
GROUP BY
    dest_port, dest_ip, src_vm
ORDER BY
    connection_count DESC
LIMIT 50;
```

## Step 5 - Set Up Alerts for Suspicious Activity

Use Cloud Monitoring to create alerts based on flow log patterns.

```bash
# Create an alert policy for high-volume egress from a single VM
gcloud alpha monitoring policies create \
    --notification-channels=projects/my-project/notificationChannels/12345 \
    --display-name="High Egress Alert" \
    --condition-display-name="Egress exceeds 10GB in 1 hour" \
    --condition-filter='resource.type="gce_instance" AND metric.type="compute.googleapis.com/instance/network/sent_bytes_count"' \
    --condition-threshold-value=10737418240 \
    --condition-threshold-duration=3600s
```

## Step 6 - Visualize Traffic Patterns

For ongoing monitoring, create a dashboard in Looker Studio (formerly Data Studio) connected to your BigQuery flow log tables. Key visualizations to build:

- Traffic volume over time by source/destination
- Geographic distribution of external connections
- Top talkers (VMs generating the most traffic)
- Denied flow trends
- Protocol and port distribution

## Cost Management

VPC Flow Logs can generate significant log volume. Here are strategies to manage costs:

```bash
# Reduce sampling for less critical subnets
gcloud compute networks subnets update low-priority-subnet \
    --region=us-central1 \
    --logging-flow-sampling=0.1

# Filter to only capture specific traffic (e.g., only denied flows)
gcloud compute networks subnets update my-subnet \
    --region=us-central1 \
    --logging-filter-expr='jsonPayload.disposition=="DENIED"'

# Set log retention in Cloud Logging
gcloud logging buckets update _Default \
    --location=global \
    --retention-days=30
```

## Wrapping Up

VPC Flow Logs are one of the most useful tools for network forensics on Google Cloud. By exporting them to BigQuery, you get the ability to run arbitrary SQL queries against your network traffic history - finding suspicious IPs, detecting data exfiltration, and identifying misconfigured firewalls. Enable flow logs on all subnets that handle sensitive traffic, set the sampling rate to 1.0 for security-critical subnets, and build a library of forensic queries that your security team can use during investigations. The cost of storing flow logs is a small price to pay for the visibility they provide.
