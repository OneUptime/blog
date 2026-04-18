# How to Use GCP VPC Flow Logs to Monitor IPv4 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Flow Logs, IPv4, Monitoring, Network, Cloud Logging

Description: Enable and analyze GCP VPC Flow Logs to monitor IPv4 traffic flows between VM instances, external endpoints, and Google services for security and performance analysis.

## Introduction

GCP VPC Flow Logs capture a sample of network flows (TCP, UDP, ICMP, ESP, and GRE) sent and received by VM instances. Logs include source and destination IPs and ports, protocol, bytes transferred, and GCP metadata like project, region, and VM name. They are invaluable for security monitoring, cost analysis, and troubleshooting.

## Enabling VPC Flow Logs on a Subnet

```bash
PROJECT_ID="my-gcp-project"
REGION="us-central1"

# Enable flow logs with default sampling (0.5 = 50%)

gcloud compute networks subnets update app-subnet \
  --project=$PROJECT_ID \
  --region=$REGION \
  --enable-flow-logs

# Enable with custom sampling rate and metadata
gcloud compute networks subnets update app-subnet \
  --project=$PROJECT_ID \
  --region=$REGION \
  --enable-flow-logs \
  --logging-flow-sampling=1.0 \
  --logging-metadata=INCLUDE_ALL_METADATA \
  --logging-aggregation-interval=INTERVAL_5_SEC \
  --logging-filter-expr='!inIpRange(connection.src_ip, "169.254.0.0/16")'
```

## Verifying Flow Logs are Enabled

```bash
gcloud compute networks subnets describe app-subnet \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format="get(logConfig.enable, logConfig.flowSampling)"
```

## Querying Flow Logs in Cloud Logging

Flow logs appear in Cloud Logging under the resource type `gce_subnetwork`:

```bash
# Using gcloud to query recent flow logs
gcloud logging read \
  'resource.type="gce_subnetwork" AND jsonPayload.reporter="SRC"' \
  --project=$PROJECT_ID \
  --limit=10 \
  --format=json
```

## Querying with BigQuery

Export logs to BigQuery for large-scale analysis:

```bash
# Create a log sink to BigQuery
gcloud logging sinks create vpc-flow-sink \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/network_logs \
  --project=$PROJECT_ID \
  --log-filter='resource.type="gce_subnetwork"'
```

Then query in BigQuery:

```sql
-- Top talkers by bytes transferred
SELECT
  jsonPayload.connection.src_ip,
  jsonPayload.connection.dest_ip,
  jsonPayload.connection.dest_port,
  SUM(CAST(jsonPayload.bytes_sent AS INT64)) as total_bytes
FROM `my-gcp-project.network_logs.compute_googleapis_com_vpc_flows_*`
WHERE DATE(_PARTITIONTIME) = CURRENT_DATE()
GROUP BY 1, 2, 3
ORDER BY total_bytes DESC
LIMIT 20;
```

## Flow Log Fields

| Field | Description |
|---|---|
| connection.src_ip | Source IPv4 address |
| connection.src_port | Source port |
| connection.dest_ip | Destination IPv4 address |
| connection.dest_port | Destination port |
| connection.protocol | IP protocol (6=TCP, 17=UDP) |
| bytes_sent | Bytes from source to destination |
| packets_sent | Packet count |
| reporter | SRC or DEST (reporter's perspective) |
| start_time | Flow start time |

## Security Use Case: Detecting Port Scans

```bash
# Find IPs connecting to many different ports (port scan indicator)
gcloud logging read \
  'resource.type="gce_subnetwork" AND jsonPayload.reporter="DEST"' \
  --project=$PROJECT_ID \
  --format=json | python3 -c "
import sys, json
from collections import defaultdict
logs = json.load(sys.stdin)
src_ports = defaultdict(set)
for entry in logs:
  p = entry.get('jsonPayload', {})
  c = p.get('connection', {})
  src_ports[c.get('src_ip','')].add(c.get('dest_port',''))
for ip, ports in sorted(src_ports.items(), key=lambda x: len(x[1]), reverse=True)[:10]:
  print(f'{ip}: {len(ports)} distinct dest ports')
"
```

## Disabling Flow Logs

```bash
gcloud compute networks subnets update app-subnet \
  --project=$PROJECT_ID \
  --region=$REGION \
  --no-enable-flow-logs
```

## Conclusion

Enable VPC Flow Logs with `--enable-flow-logs` on subnets. Use `--logging-flow-sampling=1.0` for full capture (costs more) or 0.5 for 50% sampling. Query logs in Cloud Logging for real-time analysis or export to BigQuery for historical trend analysis. Flow logs are essential for security auditing, compliance, and network cost optimization.
