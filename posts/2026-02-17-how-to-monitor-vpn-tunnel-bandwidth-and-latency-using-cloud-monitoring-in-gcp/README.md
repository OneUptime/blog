# How to Monitor VPN Tunnel Bandwidth and Latency Using Cloud Monitoring in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud VPN, Cloud Monitoring, Observability, Networking, VPN

Description: Learn how to monitor GCP Cloud VPN tunnel performance including bandwidth utilization and latency metrics using Cloud Monitoring dashboards and alerts.

---

Setting up a Cloud VPN tunnel in GCP is only half the battle. Once it is running, you need to know if it is healthy, whether you are approaching bandwidth limits, and if latency is within acceptable thresholds. Without proper monitoring, a degraded tunnel can silently impact your applications for hours before anyone notices.

In this post, I will show you how to use Cloud Monitoring to track VPN tunnel bandwidth and latency, set up dashboards, and configure alerting policies.

## Available VPN Metrics

GCP exposes several metrics for Cloud VPN tunnels under the `compute.googleapis.com` namespace. The most useful ones are:

| Metric | Description |
|--------|-------------|
| `vpn/sent_bytes_count` | Total bytes sent through the tunnel |
| `vpn/received_bytes_count` | Total bytes received through the tunnel |
| `vpn/sent_packets_count` | Total packets sent |
| `vpn/received_packets_count` | Total packets received |
| `vpn/dropped_packets_count` | Packets dropped by the tunnel |
| `vpn/tunnel_established` | Whether the tunnel is up (1) or down (0) |

For HA VPN, there are additional RTT (round-trip time) metrics that help measure latency.

## Viewing Metrics in the Console

The quickest way to check on your VPN tunnels is through Metrics Explorer in Cloud Monitoring.

1. Go to Cloud Monitoring in the GCP Console
2. Navigate to Metrics Explorer
3. In the metric field, search for `vpn`
4. Select `compute.googleapis.com/vpn/sent_bytes_count`

This gives you a time series chart of bytes sent through each tunnel. You can group by tunnel name to see each tunnel individually.

## Querying Metrics with MQL

For more advanced queries, you can use Monitoring Query Language (MQL). Here is a query that shows bandwidth in megabits per second for each tunnel:

```sql
# Calculate sent bandwidth in Mbps per VPN tunnel
fetch vpn_gateway
| metric 'compute.googleapis.com/vpn/sent_bytes_count'
| align rate(1m)
| every 1m
| map_add [bandwidth_mbps: val() * 8.0 / 1000000.0]
| group_by [resource.tunnel_name], [max(bandwidth_mbps)]
```

And here is one for received bandwidth:

```sql
# Calculate received bandwidth in Mbps per VPN tunnel
fetch vpn_gateway
| metric 'compute.googleapis.com/vpn/received_bytes_count'
| align rate(1m)
| every 1m
| map_add [bandwidth_mbps: val() * 8.0 / 1000000.0]
| group_by [resource.tunnel_name], [max(bandwidth_mbps)]
```

## Building a VPN Monitoring Dashboard

A dedicated dashboard saves you from digging through Metrics Explorer every time. You can create one using the Cloud Console or through Terraform.

Here is how to create a dashboard using the gcloud CLI with a JSON definition:

```bash
# Create a VPN monitoring dashboard from a JSON config file
gcloud monitoring dashboards create \
    --config-from-file=vpn-dashboard.json
```

The dashboard JSON definition should look something like this:

```json
{
  "displayName": "VPN Tunnel Health",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Tunnel Status",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"compute.googleapis.com/vpn/tunnel_established\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_MEAN"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Sent Bytes Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"compute.googleapis.com/vpn/sent_bytes_count\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

## Measuring Latency

GCP does not provide a built-in latency metric for Classic VPN tunnels, but HA VPN exposes RTT data through the `vpn/gateway/connections` resource type. For Classic VPN, you need to measure latency yourself.

A practical approach is to run a lightweight monitoring agent on VMs at both ends of the tunnel:

```bash
# Simple ping-based latency check between two VMs across the tunnel
# Run this on a VM in VPC-1, pinging a VM in VPC-2
ping -c 10 -i 1 10.2.0.5 | tail -1

# Example output:
# rtt min/avg/max/mdev = 1.234/2.456/3.789/0.567 ms
```

For a more robust approach, use a custom metric in Cloud Monitoring. Here is a Python script that measures latency and pushes it as a custom metric:

```python
# vpn_latency_monitor.py - Measures and reports VPN tunnel latency
import subprocess
import time
from google.cloud import monitoring_v3

def measure_latency(target_ip, count=5):
    """Run ping and extract average latency in milliseconds."""
    result = subprocess.run(
        ["ping", "-c", str(count), "-W", "2", target_ip],
        capture_output=True, text=True
    )
    # Parse the avg from the summary line
    for line in result.stdout.split("\n"):
        if "avg" in line:
            parts = line.split("/")
            return float(parts[4])
    return -1  # Indicates failure

def write_custom_metric(project_id, tunnel_name, latency_ms):
    """Write latency value to Cloud Monitoring as a custom metric."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/vpn/tunnel_latency_ms"
    series.metric.labels["tunnel_name"] = tunnel_name
    series.resource.type = "global"
    series.resource.labels["project_id"] = project_id

    now = time.time()
    interval = monitoring_v3.TimeInterval(
        {"end_time": {"seconds": int(now)}}
    )
    point = monitoring_v3.Point(
        {"interval": interval, "value": {"double_value": latency_ms}}
    )
    series.points = [point]

    client.create_time_series(
        request={"name": project_name, "time_series": [series]}
    )

if __name__ == "__main__":
    project_id = "my-project-id"
    tunnel_name = "tunnel-to-onprem"
    target_ip = "10.2.0.5"  # IP of a host on the other side

    latency = measure_latency(target_ip)
    if latency > 0:
        write_custom_metric(project_id, tunnel_name, latency)
        print(f"Reported latency: {latency}ms for {tunnel_name}")
    else:
        print("Ping failed - tunnel may be down")
```

Schedule this script to run every minute using cron or a systemd timer.

## Setting Up Alerts

Monitoring is only useful if you get notified when things go wrong. Here are the alerts every VPN setup should have.

Alert when a tunnel goes down:

```bash
# Create an alert policy for VPN tunnel down
gcloud alpha monitoring policies create \
    --display-name="VPN Tunnel Down" \
    --condition-display-name="Tunnel not established" \
    --condition-filter='metric.type="compute.googleapis.com/vpn/tunnel_established" AND resource.type="vpn_gateway"' \
    --condition-comparison=COMPARISON_LT \
    --condition-threshold-value=1 \
    --condition-duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

Alert when bandwidth exceeds 80% of the tunnel capacity (3 Gbps for HA VPN):

```bash
# Create an alert for high bandwidth utilization
gcloud alpha monitoring policies create \
    --display-name="VPN High Bandwidth" \
    --condition-display-name="Bandwidth over 80%" \
    --condition-filter='metric.type="compute.googleapis.com/vpn/sent_bytes_count" AND resource.type="vpn_gateway"' \
    --condition-comparison=COMPARISON_GT \
    --condition-threshold-value=300000000 \
    --condition-duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

## Packet Drop Monitoring

Dropped packets are a critical signal that something is wrong. Here is how to query for packet drops:

```sql
# Monitor dropped packets across all VPN tunnels
fetch vpn_gateway
| metric 'compute.googleapis.com/vpn/dropped_packets_count'
| align rate(1m)
| every 1m
| group_by [resource.tunnel_name], [sum(val())]
| condition val() > 10 '1/s'
```

Non-zero packet drops can indicate:

- MTU issues causing fragmentation and reassembly failures
- Bandwidth saturation
- Routing asymmetry
- IPsec SA rekeying issues

## Summary

Monitoring your VPN tunnels is not optional for production workloads. At minimum, you should track tunnel status, bandwidth utilization, packet drops, and latency. Cloud Monitoring gives you most of what you need out of the box, and custom metrics fill in the gaps for latency measurement.

Set up your dashboards and alerts before you put real traffic through the tunnel. It is much easier to establish baselines and catch problems early than to debug a degraded tunnel while users are complaining.
