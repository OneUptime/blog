# How to Monitor Cloud Interconnect Link Utilization and Health in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Interconnect, Monitoring, Cloud Monitoring, Networking, Observability

Description: Learn how to monitor Cloud Interconnect link utilization, health metrics, and BGP session status using GCP Cloud Monitoring dashboards and alerts.

---

A Dedicated or Partner Interconnect link is a critical piece of infrastructure. When it degrades or goes down, your hybrid connectivity breaks and production workloads are affected. Unlike a VM that you can just restart, an Interconnect issue might involve physical hardware, service providers, or colocation facilities - making it all the more important to catch problems early.

In this post, I will show you how to monitor your Cloud Interconnect using Cloud Monitoring, what metrics to watch, how to build a useful dashboard, and what alerts to set up.

## Available Metrics

GCP exposes Interconnect metrics under the `interconnect.googleapis.com` namespace. For Dedicated Interconnect, Cloud Monitoring collects Interconnect and VLAN attachment metrics. For Partner Interconnect, it collects VLAN attachment metrics. Here are the most important ones:

### Link-Level Metrics

| Metric | Description |
|--------|-------------|
| `network/interconnect/received_bytes_count` | Bytes received on the Interconnect |
| `network/interconnect/sent_bytes_count` | Bytes sent on the Interconnect |
| `network/interconnect/link/rx_power` | Receive optical light level (dBm) |
| `network/interconnect/link/tx_power` | Transmit optical light level (dBm) |
| `network/interconnect/link/operational` | Whether the physical circuit is up (`true`) or down (`false`) |

### Attachment-Level Metrics

| Metric | Description |
|--------|-------------|
| `network/attachment/received_bytes_count` | Bytes received on the VLAN attachment |
| `network/attachment/sent_bytes_count` | Bytes sent on the VLAN attachment |
| `network/attachment/received_packets_count` | Packets received |
| `network/attachment/sent_packets_count` | Packets sent |
| `network/attachment/capacity` | Configured bandwidth capacity |

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
    --filter='metric.type="interconnect.googleapis.com/network/interconnect/sent_bytes_count" AND resource.type="interconnect" AND resource.labels.interconnect="my-interconnect"' \
    --interval-start-time=$(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%SZ) \
    --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --aggregation-alignment-period=60s \
    --aggregation-per-series-aligner=ALIGN_RATE \
    --format="table(points[].value.doubleValue, points[].interval.endTime)"
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
                    filter = "metric.type=\"interconnect.googleapis.com/network/interconnect/link/operational\" resource.type=\"interconnect\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_FRACTION_TRUE"
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
            title = "Interconnect Bandwidth (Sent)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"interconnect.googleapis.com/network/interconnect/sent_bytes_count\" resource.type=\"interconnect\""
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
                    filter = "metric.type=\"interconnect.googleapis.com/network/interconnect/link/rx_power\" resource.type=\"interconnect\""
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
# Alert when any interconnect circuit goes down
gcloud alpha monitoring policies create \
    --display-name="Interconnect Link Down" \
    --condition-display-name="Link operational status is false" \
    --condition-filter='metric.type="interconnect.googleapis.com/network/interconnect/link/operational" AND resource.type="interconnect"' \
    --aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_FRACTION_TRUE"}' \
    --if="< 1" \
    --duration=60s \
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
    --condition-filter='metric.type="interconnect.googleapis.com/network/interconnect/sent_bytes_count" AND resource.type="interconnect"' \
    --aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_RATE"}' \
    --if="> 1000000000" \
    --duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

### Alert 3: Optical Power Degradation

Get warned before the link actually drops:

```bash
# Alert when receive optical power drops below warning threshold
gcloud alpha monitoring policies create \
    --display-name="Interconnect Low Optical Power" \
    --condition-display-name="RX light level low" \
    --condition-filter='metric.type="interconnect.googleapis.com/network/interconnect/link/rx_power" AND resource.type="interconnect"' \
    --aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_MEAN"}' \
    --if="< -10" \
    --duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

## Monitoring BGP Sessions

BGP session health is just as important as the physical link. Use Cloud Router status:

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

Beyond alerting, use bandwidth metrics for capacity planning. Export metrics to BigQuery for long-term analysis by reading the Cloud Monitoring API on a schedule and writing the returned time series to BigQuery:

```bash
# Read hourly Interconnect sent-byte rates as JSON for an export job
gcloud monitoring time-series list \
    --filter='metric.type="interconnect.googleapis.com/network/interconnect/sent_bytes_count" AND resource.type="interconnect"' \
    --interval-start-time=$(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%SZ) \
    --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --aggregation-alignment-period=3600s \
    --aggregation-per-series-aligner=ALIGN_RATE \
    --format=json
```

Then query historical utilization to identify trends:

```sql
-- Query peak bandwidth utilization over the past 30 days
SELECT
  DATE(point.interval.end_time) as date,
  MAX(point.value.double_value) as peak_bytes_per_second,
  AVG(point.value.double_value) as avg_bytes_per_second
FROM `my-project.network_metrics.interconnect_metrics_export`
WHERE point.interval.end_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date DESC
```

## Wrapping Up

Monitoring Cloud Interconnect effectively means watching three layers: the physical link (operational status and optical levels), the logical layer (VLAN attachment bandwidth and packet counts), and the routing layer (BGP session health and route counts). Set up alerts for all three layers, build a dashboard that shows them together, and use historical data for capacity planning. The optical light level monitoring alone has saved many people from unexpected outages by catching degrading fiber connections before they fail completely.
