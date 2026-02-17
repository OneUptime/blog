# How to Monitor Cloud Interconnect Link Utilization and Health in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Interconnect, Monitoring, Cloud Monitoring, Networking, Observability

Description: Learn how to monitor Cloud Interconnect link utilization, health metrics, and BGP session status using GCP Cloud Monitoring dashboards and alerts.

---

A Dedicated or Partner Interconnect link is a critical piece of infrastructure. When it degrades or goes down, your hybrid connectivity breaks and production workloads are affected. Unlike a VM that you can just restart, an Interconnect issue might involve physical hardware, service providers, or colocation facilities - making it all the more important to catch problems early.

In this post, I will show you how to monitor your Cloud Interconnect using Cloud Monitoring, what metrics to watch, how to build a useful dashboard, and what alerts to set up.

## Available Metrics

GCP exposes Interconnect metrics under the `compute.googleapis.com` namespace. Here are the most important ones:

### Link-Level Metrics

| Metric | Description |
|--------|-------------|
| `interconnect/link/received_bytes_count` | Bytes received on the physical link |
| `interconnect/link/transmitted_bytes_count` | Bytes transmitted on the physical link |
| `interconnect/link/rx_light_level` | Receive optical light level (dBm) |
| `interconnect/link/tx_light_level` | Transmit optical light level (dBm) |
| `interconnect/link/operational_status` | Whether the link is up (1) or down (0) |

### Attachment-Level Metrics

| Metric | Description |
|--------|-------------|
| `interconnect/attachment/received_bytes_count` | Bytes received on the VLAN attachment |
| `interconnect/attachment/transmitted_bytes_count` | Bytes transmitted on the VLAN attachment |
| `interconnect/attachment/received_packets_count` | Packets received |
| `interconnect/attachment/transmitted_packets_count` | Packets transmitted |
| `interconnect/attachment/capacity` | Configured bandwidth capacity |

## Checking Link Health Quickly

For a quick health check, use the diagnostics command:

```bash
# Get comprehensive diagnostics for your interconnect
gcloud compute interconnects get-diagnostics my-interconnect \
    --format="yaml(result)"
```

This returns a snapshot including:

- MAC address of the connected device
- ARP entry status
- Circuit ID information
- Link operational status

## Querying Metrics with gcloud

You can query specific metrics from the command line:

```bash
# Check link utilization for the last hour
gcloud monitoring time-series list \
    --filter='metric.type="compute.googleapis.com/interconnect/link/transmitted_bytes_count" AND resource.labels.interconnect_name="my-interconnect"' \
    --interval-start-time=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
    --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --format="table(points[].value.int64Value, points[].interval.endTime)"
```

## Building a Monitoring Dashboard

A dedicated Interconnect dashboard should show link health, bandwidth utilization, and optical levels at a glance.

Here is a Terraform configuration for a comprehensive dashboard:

```hcl
# Terraform configuration for Cloud Interconnect monitoring dashboard
resource "google_monitoring_dashboard" "interconnect_dashboard" {
  dashboard_json = jsonencode({
    displayName = "Cloud Interconnect Health"
    mosaicLayout = {
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "Link Operational Status"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"compute.googleapis.com/interconnect/link/operational_status\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
              }]
            }
          }
        },
        {
          xPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "Link Bandwidth (Transmitted)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"compute.googleapis.com/interconnect/link/transmitted_bytes_count\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
              }]
            }
          }
        },
        {
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Receive Light Level (dBm)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"compute.googleapis.com/interconnect/link/rx_light_level\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
}
```

## Optical Light Level Monitoring

This is something people often overlook, but it is one of the most valuable early warning signals. The optical light levels tell you about the health of the physical fiber connection.

Normal light levels for 10G-LR optics:

| Measurement | Normal Range | Warning | Critical |
|------------|-------------|---------|----------|
| TX Power | -8.2 to +0.5 dBm | Below -8.2 dBm | Below -12 dBm |
| RX Power | -14.4 to +0.5 dBm | Below -10 dBm | Below -14.4 dBm |

Degrading light levels can indicate:

- Dirty fiber connectors (most common cause)
- Fiber bends or damage
- Failing optics/transceiver
- Cross-connect issues at the colocation facility

Monitor the trend over time. A gradual decline is easier to address proactively than a sudden failure.

```bash
# Check current optical light levels
gcloud compute interconnects get-diagnostics my-interconnect \
    --format="yaml(result.links[].lacpStatus, result.links[].receivingOpticalPower, result.links[].transmittingOpticalPower)"
```

## Setting Up Critical Alerts

### Alert 1: Link Down

This is the most important alert. Set it to trigger immediately:

```bash
# Alert when interconnect link goes down
gcloud alpha monitoring policies create \
    --display-name="Interconnect Link Down" \
    --condition-display-name="Link operational status is 0" \
    --condition-filter='metric.type="compute.googleapis.com/interconnect/link/operational_status" AND resource.type="interconnect"' \
    --condition-comparison=COMPARISON_LT \
    --condition-threshold-value=1 \
    --condition-duration=60s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

### Alert 2: High Bandwidth Utilization

Trigger when you are approaching the link capacity:

```bash
# Alert when bandwidth exceeds 80% of 10G link capacity
# 10G = 1,250,000,000 bytes/sec, 80% = 1,000,000,000 bytes/sec
gcloud alpha monitoring policies create \
    --display-name="Interconnect High Bandwidth" \
    --condition-display-name="Bandwidth over 80%" \
    --condition-filter='metric.type="compute.googleapis.com/interconnect/link/transmitted_bytes_count" AND resource.type="interconnect"' \
    --condition-comparison=COMPARISON_GT \
    --condition-threshold-value=1000000000 \
    --condition-duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

### Alert 3: Optical Power Degradation

Get warned before the link actually drops:

```bash
# Alert when receive optical power drops below warning threshold
gcloud alpha monitoring policies create \
    --display-name="Interconnect Low Optical Power" \
    --condition-display-name="RX light level low" \
    --condition-filter='metric.type="compute.googleapis.com/interconnect/link/rx_light_level" AND resource.type="interconnect"' \
    --condition-comparison=COMPARISON_LT \
    --condition-threshold-value=-10 \
    --condition-duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

## Monitoring BGP Sessions

BGP session health is just as important as the physical link. Use Cloud Router metrics:

```bash
# Check BGP peer status for the interconnect router
gcloud compute routers get-status ic-router \
    --region=us-east4 \
    --format="table(result.bgpPeerStatus[].name, result.bgpPeerStatus[].status, result.bgpPeerStatus[].numLearnedRoutes, result.bgpPeerStatus[].uptimeSeconds)"
```

Set up a monitoring script that checks BGP status periodically:

```python
# bgp_monitor.py - Check BGP session health and alert on issues
from google.cloud import compute_v1
import json

def check_bgp_health(project_id, region, router_name):
    """Check the BGP peer status on a Cloud Router."""
    client = compute_v1.RoutersClient()

    # Get router status
    status = client.get_router_status(
        project=project_id,
        region=region,
        router=router_name
    )

    results = []
    for peer in status.result.bgp_peer_status:
        peer_info = {
            "name": peer.name,
            "status": peer.status,
            "learned_routes": peer.num_learned_routes,
            "uptime_seconds": peer.uptime_seconds
        }
        results.append(peer_info)

        # Flag any peer that is not UP
        if peer.status != "UP":
            print(f"WARNING: BGP peer {peer.name} is {peer.status}")

    return results

if __name__ == "__main__":
    peers = check_bgp_health("my-project", "us-east4", "ic-router")
    for p in peers:
        print(f"Peer: {p['name']}, Status: {p['status']}, "
              f"Routes: {p['learned_routes']}, "
              f"Uptime: {p['uptime_seconds']}s")
```

## Capacity Planning

Beyond alerting, use bandwidth metrics for capacity planning. Export metrics to BigQuery for long-term analysis:

```bash
# Create a log sink to export interconnect metrics to BigQuery
gcloud logging sinks create interconnect-metrics-sink \
    bigquery.googleapis.com/projects/my-project/datasets/network_metrics \
    --log-filter='resource.type="interconnect"'
```

Then query historical utilization to identify trends:

```sql
-- Query peak bandwidth utilization over the past 30 days
SELECT
  DATE(timestamp) as date,
  MAX(json_value(json_payload, '$.value')) as peak_bytes_per_second,
  AVG(json_value(json_payload, '$.value')) as avg_bytes_per_second
FROM `my-project.network_metrics.interconnect_metrics`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date DESC
```

## Wrapping Up

Monitoring Cloud Interconnect effectively means watching three layers: the physical link (operational status and optical levels), the logical layer (VLAN attachment bandwidth and packet counts), and the routing layer (BGP session health and route counts). Set up alerts for all three layers, build a dashboard that shows them together, and use historical data for capacity planning. The optical light level monitoring alone has saved many people from unexpected outages by catching degrading fiber connections before they fail completely.
