# How to Troubleshoot Compute Engine VM Performance Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Cloud Monitoring, Performance, Troubleshooting

Description: A practical guide to diagnosing Compute Engine VM performance problems using Cloud Monitoring metrics, covering CPU throttling, memory pressure, disk I/O bottlenecks, and network saturation.

---

Your VM is slow, and someone is asking why. The application is lagging, users are complaining, and you need answers fast. Cloud Monitoring has the data, but knowing which metrics to look at and what they mean is the difference between fixing the issue in minutes and chasing it for hours.

I have debugged enough performance issues on Compute Engine to have a systematic approach. Here is what I check, in order.

## Start with the Overview

Before diving into specific metrics, get a quick snapshot of the VM's health:

```bash
# Get basic instance information including machine type and status

gcloud compute instances describe slow-vm \
  --zone=us-central1-a \
  --format="table(name, machineType.basename(), status, scheduling.preemptible)"
```

Check if the instance is on a shared-core machine type (e2-micro, e2-small, f1-micro). These have CPU bursting limits that can cause unexpected throttling.

## CPU: The First Suspect

CPU utilization is usually the first place to look. But raw utilization alone does not tell the full story.

Query CPU utilization from Cloud Monitoring:

```bash
# Get CPU utilization for the last hour
PROJECT_ID="my-project"
START_TIME=$(date -u -d '-1 hour' +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="compute.googleapis.com/instance/cpu/utilization" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"
```

If CPU is consistently above 85%, the VM is likely CPU-bound. But high CPU alone does not always mean a problem - it could just mean the VM is efficiently using its resources.

The more telling metric for CPU scheduling delay is **scheduler wait time**, which is available for E2 VMs and overcommitted VMs on sole-tenant nodes:

```bash
# Check if vCPUs are ready to run but waiting to be scheduled
curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="compute.googleapis.com/instance/cpu/scheduler_wait_time" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"
```

If scheduler wait time is consistently high, the fix is straightforward: upgrade to a larger machine type or switch from a shared-core to a dedicated type.

## Memory: The Silent Killer

GCP does not collect memory metrics by default. You need the Ops Agent installed to get memory data. Once it is running, you can check memory utilization:

```bash
# Check memory utilization (requires Ops Agent)
curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="agent.googleapis.com/memory/percent_used" AND metric.labels.state="used" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"
```

Memory problems manifest in different ways:

- **High memory utilization (above 90%)** - The VM is running out of RAM. Applications start swapping to disk, which is orders of magnitude slower.
- **Swap usage increasing** - Check swap activity to confirm memory pressure is causing disk I/O.
- **OOM kills** - The kernel is killing processes to free memory. Check dmesg or system logs.

From inside the VM:

```bash
# Check current memory usage
free -m

# Check for OOM kills in kernel messages
dmesg | grep -i "out of memory"

# Check swap usage
swapon --show
```

If memory is the bottleneck, you have two options: optimize your application's memory usage or move to a machine type with more RAM. The N2-highmem and M2 machine types are designed for memory-intensive workloads.

## Disk I/O: The Hidden Bottleneck

Disk performance problems are sneaky because they do not always show up as high CPU or memory usage. Instead, you see increased latency and processes stuck in I/O wait.

Check disk read/write operations:

```bash
# Check disk read IOPS over the last hour
curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="compute.googleapis.com/instance/disk/read_ops_count" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"

# Check disk write IOPS
curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="compute.googleapis.com/instance/disk/write_ops_count" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"
```

More importantly, check disk latency and queue depth:

```bash
# Check disk average I/O latency
curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="compute.googleapis.com/instance/disk/average_io_latency" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"

# Check disk average I/O queue depth
curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="compute.googleapis.com/instance/disk/average_io_queue_depth" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"
```

If latency and queue depth are high while read/write operations are near the disk or VM limits, your disk is likely hitting its IOPS or throughput limit. Persistent disk performance scales with disk size and VM vCPU count - a 100 GB pd-ssd provides fewer IOPS than a 500 GB pd-ssd when the VM is not already the limiting factor. The fix might be as simple as increasing the disk size.

From inside the VM, `iostat` gives you real-time disk metrics:

```bash
# Real-time disk I/O statistics updated every second
iostat -xm 1

# Key columns to watch:
# %util - percentage of time the device is busy (above 80% is concerning)
# await - average time for I/O requests (high values mean disk latency)
# r/s, w/s - read and write operations per second
```

## Network: Throughput and Packet Loss

Network issues can look like application slowness when connections time out or throughput is saturated.

Check network throughput:

```bash
# Check bytes sent from the VM
curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="compute.googleapis.com/instance/network/sent_bytes_count" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"

# Check bytes received
curl -s -G \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/timeSeries" \
  --data-urlencode 'filter=metric.type="compute.googleapis.com/instance/network/received_bytes_count" AND resource.labels.instance_id="INSTANCE_ID"' \
  --data-urlencode "interval.startTime=${START_TIME}" \
  --data-urlencode "interval.endTime=${END_TIME}" \
  --data-urlencode "view=FULL"
```

Network bandwidth on Compute Engine scales with the number of vCPUs. An e2-medium (2 vCPUs) gets up to 2 Gbps egress. If you are hitting that cap, you will see increased latency and dropped connections.

Check for packet drops inside the VM:

```bash
# Check network interface statistics for errors and drops
ip -s link show

# Check TCP connection states and retransmissions
ss -s
```

## Creating a Monitoring Dashboard

Once you know which metrics matter, set up a dashboard so you can spot issues before they escalate. Here is a gcloud command to create a dashboard with the key performance metrics:

```bash
# Create a monitoring dashboard configuration file
cat > dashboard.json << 'ENDJSON'
{
  "displayName": "VM Performance Dashboard",
  "gridLayout": {
    "columns": 2,
    "widgets": [
      {
        "title": "CPU Utilization",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\""
              }
            }
          }]
        }
      },
      {
        "title": "Disk IOPS",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/disk/read_ops_count\""
              }
            }
          }]
        }
      }
    ]
  }
}
ENDJSON

# Create the dashboard
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

## Setting Up Alerts

Proactive alerting catches performance issues before they become user-facing problems:

```bash
# Create an alert for high CPU utilization
gcloud monitoring policies create \
  --display-name="High CPU Alert" \
  --condition-display-name="CPU above 85% for 5 minutes" \
  --condition-filter='resource.type="gce_instance" AND metric.type="compute.googleapis.com/instance/cpu/utilization"' \
  --if='> 0.85' \
  --duration=300s \
  --combiner=OR
```

## The Systematic Approach

When a VM performance issue comes in, here is my checklist:

1. Check CPU utilization and scheduler wait time - is the VM CPU-bound?
2. Check memory usage (needs Ops Agent) - is the VM swapping?
3. Check disk I/O, latency, and queue depth - is the disk the bottleneck?
4. Check network throughput - is bandwidth saturated?
5. Check the application itself - sometimes the issue is in the code, not the infrastructure.

Most performance issues fall into one of these categories. The metrics are all there in Cloud Monitoring - you just need to know where to look. Install the Ops Agent on every VM from day one, because the default metrics do not include memory or detailed process information, and those are often the missing pieces of the puzzle.
