# How to Enable and Analyze Cloud NAT Logging for Troubleshooting in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud NAT, Logging, Troubleshooting, Monitoring

Description: Enable Cloud NAT logging, understand the log structure, and use log queries to diagnose connectivity issues, port exhaustion, and unexpected NAT behavior.

---

Cloud NAT logging is your primary troubleshooting tool when things go wrong with outbound connectivity from private VMs. Without logging, you are flying blind - you know something is broken but have no visibility into what is actually happening at the NAT layer. With logging enabled, you can see every translation, every dropped packet, and every port allocation failure.

This guide covers enabling logging, understanding the log format, and writing queries that answer the questions you actually need answered when troubleshooting.

## Enabling Cloud NAT Logging

Cloud NAT logging is disabled by default. Enable it on your NAT gateway:

```bash
# Enable logging with all events
gcloud compute routers nats update your-nat-gateway \
  --router=your-router \
  --region=us-central1 \
  --enable-logging \
  --log-filter=ALL \
  --project=your-project-id
```

The `--log-filter` flag accepts three values:

- `ALL` - logs both successful translations and errors (most useful for troubleshooting)
- `ERRORS_ONLY` - logs only dropped packets and allocation failures (good for production to reduce log volume)
- `TRANSLATIONS_ONLY` - logs only successful translations (useful for auditing outbound connections)

For initial troubleshooting, always use `ALL`. Switch to `ERRORS_ONLY` for ongoing production monitoring to reduce costs.

## Understanding the Log Structure

Cloud NAT logs are written to Cloud Logging under the `compute.googleapis.com/nat_flows` log name. Each log entry contains a `jsonPayload` with the following key fields:

| Field | Description |
|-------|-------------|
| `connection.src_ip` | Internal IP of the VM |
| `connection.src_port` | Source port on the VM |
| `connection.dest_ip` | External destination IP |
| `connection.dest_port` | External destination port |
| `connection.protocol` | Protocol number (6=TCP, 17=UDP) |
| `allocation_status` | OK or DROPPED |
| `nat_ip` | The NAT external IP used |
| `nat_port` | The NAT port assigned |
| `gateway_identifiers.gateway_name` | NAT gateway name |
| `gateway_identifiers.router_name` | Cloud Router name |

## Viewing Basic NAT Logs

Start by looking at recent NAT activity:

```bash
# View the most recent NAT logs
gcloud logging read \
  'resource.type="nat_gateway" AND resource.labels.gateway_name="your-nat-gateway"' \
  --project=your-project-id \
  --limit=20 \
  --format=json
```

For a more readable view focusing on key fields:

```bash
# View NAT logs in a readable table format
gcloud logging read \
  'resource.type="nat_gateway" AND resource.labels.gateway_name="your-nat-gateway"' \
  --project=your-project-id \
  --limit=20 \
  --format="table(timestamp, jsonPayload.connection.src_ip, jsonPayload.connection.dest_ip, jsonPayload.connection.dest_port, jsonPayload.allocation_status, jsonPayload.nat_ip)"
```

## Troubleshooting Scenario 1: Port Exhaustion

The most common issue. Look for DROPPED allocation status:

```bash
# Find all port exhaustion events
gcloud logging read \
  'resource.type="nat_gateway" AND resource.labels.gateway_name="your-nat-gateway" AND jsonPayload.allocation_status="DROPPED"' \
  --project=your-project-id \
  --freshness=24h \
  --format="table(timestamp, jsonPayload.connection.src_ip, jsonPayload.connection.dest_ip, jsonPayload.connection.dest_port)"
```

To find which VMs are most affected:

```bash
# Count port exhaustion events per VM
gcloud logging read \
  'resource.type="nat_gateway" AND jsonPayload.allocation_status="DROPPED"' \
  --project=your-project-id \
  --freshness=1h \
  --format="value(jsonPayload.connection.src_ip)" | sort | uniq -c | sort -rn
```

## Troubleshooting Scenario 2: Connection to Specific Destination Failing

When a VM cannot reach a specific external service:

```bash
# Check NAT logs for connections to a specific destination IP
gcloud logging read \
  'resource.type="nat_gateway" AND jsonPayload.connection.dest_ip="203.0.113.10"' \
  --project=your-project-id \
  --freshness=1h \
  --format="table(timestamp, jsonPayload.connection.src_ip, jsonPayload.allocation_status, jsonPayload.nat_ip)"
```

If you see `OK` status but the connection still fails, the issue is not with NAT - it is either a firewall rule, the destination rejecting your NAT IP, or a network-level problem.

If you see `DROPPED` status, the VM is hitting port exhaustion for that destination.

## Troubleshooting Scenario 3: Which NAT IP Is Being Used

When a third party reports receiving traffic from an unexpected IP:

```bash
# Find what NAT IP a specific VM is using
gcloud logging read \
  'resource.type="nat_gateway" AND jsonPayload.connection.src_ip="10.0.1.5" AND jsonPayload.allocation_status="OK"' \
  --project=your-project-id \
  --freshness=1h \
  --format="table(timestamp, jsonPayload.nat_ip, jsonPayload.connection.dest_ip)"
```

With dynamic port allocation, a VM might use different NAT IPs for different destinations.

## Troubleshooting Scenario 4: High Connection Volume from a Single VM

Identify VMs making unusually high numbers of outbound connections:

```bash
# Count connections per source VM in the last hour
gcloud logging read \
  'resource.type="nat_gateway" AND jsonPayload.allocation_status="OK"' \
  --project=your-project-id \
  --freshness=1h \
  --format="value(jsonPayload.connection.src_ip)" | sort | uniq -c | sort -rn | head -10
```

This helps you find compromised VMs or misbehaving applications that might be causing port exhaustion for other VMs.

## Troubleshooting Scenario 5: Slow NAT Translations

If connections are established but seem slow, look at the timing between log entries:

```bash
# View timestamps for connections from a specific VM to a specific destination
gcloud logging read \
  'resource.type="nat_gateway" AND jsonPayload.connection.src_ip="10.0.1.5" AND jsonPayload.connection.dest_ip="198.51.100.1"' \
  --project=your-project-id \
  --freshness=30m \
  --format="table(timestamp, jsonPayload.nat_port, jsonPayload.allocation_status)"
```

Large gaps between connection attempts followed by DROPPED events suggest the VM is retrying after port exhaustion failures.

## Creating Log-Based Metrics

Turn important log patterns into metrics you can alert on:

```bash
# Create a metric for port exhaustion events
gcloud logging metrics create nat-port-exhaustion \
  --project=your-project-id \
  --description="Cloud NAT port exhaustion (DROPPED) events" \
  --log-filter='resource.type="nat_gateway" AND jsonPayload.allocation_status="DROPPED"'

# Create a metric for total NAT translations
gcloud logging metrics create nat-translations \
  --project=your-project-id \
  --description="Successful Cloud NAT translations" \
  --log-filter='resource.type="nat_gateway" AND jsonPayload.allocation_status="OK"'
```

Then build monitoring alerts on these metrics:

```bash
# Create an alert for port exhaustion spikes
gcloud alpha monitoring policies create \
  --display-name="Cloud NAT Port Exhaustion Alert" \
  --condition-display-name="NAT port exhaustion detected" \
  --condition-filter='metric.type="logging.googleapis.com/user/nat-port-exhaustion"' \
  --condition-threshold-value=10 \
  --condition-threshold-duration=300s \
  --notification-channels=your-channel-id
```

## Log-Based Dashboard

Create a Cloud Monitoring dashboard with panels for:

1. **NAT translations per minute** - shows overall traffic volume
2. **DROPPED events per minute** - shows port exhaustion trends
3. **Top source VMs by connection count** - identifies heavy hitters
4. **Top destination IPs by connection count** - shows where traffic is going
5. **NAT IP utilization** - shows how evenly ports are distributed

## Managing Log Volume and Cost

NAT logs can generate significant volume, especially with the `ALL` filter on busy gateways. Here are strategies to manage costs:

```bash
# Switch to errors-only logging for production
gcloud compute routers nats update your-nat-gateway \
  --router=your-router \
  --region=us-central1 \
  --log-filter=ERRORS_ONLY \
  --project=your-project-id
```

You can also set up log exclusion filters to drop logs you do not need:

```bash
# Create a log exclusion for high-volume successful translations
gcloud logging sinks create nat-exclusion \
  --log-filter='resource.type="nat_gateway" AND jsonPayload.allocation_status="OK" AND jsonPayload.connection.dest_port="443"' \
  --exclusion \
  --project=your-project-id
```

When you need to troubleshoot, temporarily switch back to `ALL` logging, diagnose the issue, then switch back to `ERRORS_ONLY`.

## Wrapping Up

Cloud NAT logging is essential for operating NAT gateways reliably. Enable it from day one - at minimum with `ERRORS_ONLY` to catch port exhaustion and allocation failures. When troubleshooting, switch to `ALL` to get full visibility into translations. The combination of log queries and log-based metrics gives you both real-time troubleshooting ability and long-term trend monitoring. Without these logs, diagnosing NAT connectivity issues is mostly guesswork.
