# How to Monitor VMware vCenter with the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, VMware, vCenter, vSphere, Virtualization, Metrics, Observability

Description: Learn how to monitor VMware vCenter and ESXi hosts using the OpenTelemetry Collector vCenter receiver to track VM performance, resource usage, and cluster health.

---

VMware vCenter manages the compute backbone for a huge number of enterprises. It orchestrates ESXi hosts, virtual machines, datastores, and networks across data centers. When vCenter or its managed infrastructure has performance problems, every virtual machine and application running on top feels the impact. CPU contention slows down applications. Memory ballooning causes unpredictable latency. Datastore I/O bottlenecks affect every VM sharing that storage.

The OpenTelemetry Collector includes a dedicated vCenter receiver that connects to the vCenter API and collects detailed performance metrics from every layer of the VMware stack. This lets you bring virtualization infrastructure metrics into the same observability platform as your application telemetry, creating end-to-end visibility from VM host to application.

## How the vCenter Receiver Works

The vCenter receiver uses the VMware vSphere API (via the govmomi library) to query performance metrics from vCenter Server. vCenter already collects performance data from all managed ESXi hosts and virtual machines, so the receiver only needs to talk to vCenter, not to individual ESXi hosts.

```mermaid
graph TD
    subgraph VMware Infrastructure
        VC[vCenter Server]
        ESX1[ESXi Host 1]
        ESX2[ESXi Host 2]
        ESX3[ESXi Host 3]
        VM1[VM 1]
        VM2[VM 2]
        VM3[VM 3]
        VM4[VM 4]
    end

    ESX1 -->|Report Stats| VC
    ESX2 -->|Report Stats| VC
    ESX3 -->|Report Stats| VC
    VM1 -.->|Runs on| ESX1
    VM2 -.->|Runs on| ESX1
    VM3 -.->|Runs on| ESX2
    VM4 -.->|Runs on| ESX3

    OC[OTel Collector] -->|vSphere API| VC
    OC -->|Export Metrics| O[OneUptime]
```

The receiver collects metrics at multiple levels: cluster, host, virtual machine, datastore, and resource pool. Each level provides different insights into infrastructure health.

## Prerequisites

Before configuring the collector, you need:

- vCenter Server 6.7 or later (7.x recommended)
- A read-only vCenter user account for the collector
- Network access from the collector to the vCenter API (port 443)

Create a dedicated monitoring user in vCenter with read-only permissions. This follows the principle of least privilege and ensures the collector cannot accidentally modify your infrastructure:

```text
Steps to create a monitoring user in vCenter:
1. Navigate to Administration > Single Sign-On > Users and Groups
2. Create a new user (e.g., "otel-monitor")
3. Navigate to Administration > Access Control > Global Permissions
4. Add the user with the "Read-only" role
5. Check "Propagate to children" to inherit permissions across all objects
```

## Collector Configuration

Here is a complete configuration for monitoring a vCenter environment:

```yaml
# config.yaml - OpenTelemetry Collector for VMware vCenter
receivers:
  vcenter:
    # vCenter Server connection settings
    endpoint: "https://vcenter.yourcompany.com"
    username: "otel-monitor@vsphere.local"
    password: "${env:VCENTER_PASSWORD}"

    # TLS settings for the vCenter API connection
    tls:
      # Set to true if using self-signed certificates on vCenter
      insecure_skip_verify: false
      # Or provide a custom CA bundle
      ca_file: "/etc/ssl/certs/vcenter-ca.pem"

    # Collection interval - 5 minutes aligns with vCenter's default
    # statistics collection interval
    collection_interval: 5m

    # Metrics to collect
    metrics:
      # Virtual Machine metrics
      vcenter.vm.cpu.usage:
        enabled: true
      vcenter.vm.cpu.utilization:
        enabled: true
      vcenter.vm.memory.usage:
        enabled: true
      vcenter.vm.memory.ballooned:
        enabled: true
      vcenter.vm.memory.swapped:
        enabled: true
      vcenter.vm.disk.throughput:
        enabled: true
      vcenter.vm.disk.latency.avg:
        enabled: true
      vcenter.vm.network.throughput:
        enabled: true
      vcenter.vm.network.packet.drop.rate:
        enabled: true

      # ESXi Host metrics
      vcenter.host.cpu.usage:
        enabled: true
      vcenter.host.cpu.utilization:
        enabled: true
      vcenter.host.memory.usage:
        enabled: true
      vcenter.host.memory.utilization:
        enabled: true
      vcenter.host.disk.throughput:
        enabled: true
      vcenter.host.disk.latency.avg:
        enabled: true
      vcenter.host.network.throughput:
        enabled: true

      # Datastore metrics
      vcenter.datastore.disk.usage:
        enabled: true
      vcenter.datastore.disk.utilization:
        enabled: true

      # Cluster metrics
      vcenter.cluster.cpu.effective:
        enabled: true
      vcenter.cluster.memory.effective:
        enabled: true
      vcenter.cluster.host.count:
        enabled: true
      vcenter.cluster.vm.count:
        enabled: true

processors:
  batch:
    timeout: 30s
    send_batch_size: 2048

  resource:
    attributes:
      - key: service.name
        value: "vmware-vcenter"
        action: upsert
      - key: vcenter.instance
        value: "production-dc1"
        action: upsert

  # Filter out powered-off VMs to reduce metric volume
  filter:
    metrics:
      metric:
        - 'resource.attributes["vcenter.vm.power_state"] == "poweredOff"'

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics:
      receivers: [vcenter]
      processors: [resource, filter, batch]
      exporters: [otlp]
```

The collection interval is set to 5 minutes to align with vCenter's default statistics collection level. vCenter collects real-time statistics every 20 seconds but only retains historical statistics at 5-minute intervals by default. If you need higher resolution, you can adjust vCenter's statistics level, but be aware that level 3 and 4 generate significantly more data.

The filter processor drops metrics from powered-off VMs, which is a practical optimization. In many environments, a significant number of VMs are powered off (templates, decommissioned servers, testing VMs), and collecting metrics for them adds noise without value.

## Critical Metrics to Monitor

### CPU Contention

`vcenter.host.cpu.utilization` shows overall CPU usage on an ESXi host. When this exceeds 80%, VMs on that host may start experiencing CPU ready time, which means they are waiting for physical CPU cycles.

`vcenter.vm.cpu.usage` shows CPU usage per VM. Compare this with the VM's allocated vCPU count to understand whether the VM is CPU-constrained.

The most important CPU metric is actually CPU ready time, which indicates how long a VM waited to be scheduled on a physical CPU. Unfortunately, this is not always exposed directly by the receiver, but you can infer it from the gap between allocated and used CPU.

### Memory Pressure

VMware uses several memory management techniques that can affect performance:

`vcenter.vm.memory.ballooned` shows memory reclaimed from VMs by the balloon driver. Ballooning means the ESXi host is running low on physical memory and is asking VMs to give some back. Any non-zero balloon value is a sign of memory pressure.

`vcenter.vm.memory.swapped` shows memory that has been swapped to disk. This is worse than ballooning because disk access is orders of magnitude slower than memory access. Any VM swap activity causes significant performance degradation.

`vcenter.host.memory.utilization` above 90% is a strong signal that the host needs more memory or fewer VMs.

### Storage Performance

`vcenter.vm.disk.latency.avg` measures the average time it takes to complete disk operations. Latency under 20ms is generally healthy. Between 20ms and 50ms is concerning. Above 50ms means applications are likely experiencing noticeable slowdowns.

`vcenter.host.disk.throughput` shows the aggregate I/O throughput on each host. Compare this with the storage system's rated throughput to understand how close you are to the hardware limits.

### Datastore Capacity

`vcenter.datastore.disk.utilization` tracks how full each datastore is. Datastore space issues are particularly dangerous because they can prevent VMs from taking snapshots, block vMotion operations, and cause VMs to pause if they run out of space to write.

## Dashboard Layout

A good vCenter dashboard follows the infrastructure hierarchy:

```text
Row 1: Cluster Overview
- Total VMs running / powered off
- Cluster CPU utilization (aggregate)
- Cluster memory utilization (aggregate)
- Host count and status

Row 2: Host Health
- CPU utilization per host (bar chart)
- Memory utilization per host (bar chart)
- Disk latency per host (line chart)
- Network throughput per host (line chart)

Row 3: VM Performance (top consumers)
- Top 10 VMs by CPU usage
- Top 10 VMs by memory usage
- VMs with memory ballooning > 0
- VMs with memory swap > 0

Row 4: Storage
- Datastore utilization (bar chart)
- Datastore I/O throughput
- VM disk latency distribution (histogram)
```

## Alerting Rules

```yaml
# VMware infrastructure alerts
- alert: ESXiHostCPUHigh
  condition: vcenter.host.cpu.utilization > 85
  for: 15m
  severity: warning
  description: "ESXi host {{ host.name }} CPU utilization above 85%"

- alert: VMMemoryBallooning
  condition: vcenter.vm.memory.ballooned > 0
  for: 10m
  severity: warning
  description: "VM {{ vm.name }} has active memory ballooning"

- alert: VMMemorySwapping
  condition: vcenter.vm.memory.swapped > 0
  for: 5m
  severity: critical
  description: "VM {{ vm.name }} is swapping memory to disk"

- alert: DatastoreSpaceLow
  condition: vcenter.datastore.disk.utilization > 85
  for: 30m
  severity: warning
  description: "Datastore {{ datastore.name }} is above 85% capacity"

- alert: HighDiskLatency
  condition: vcenter.vm.disk.latency.avg > 50
  for: 10m
  severity: warning
  description: "VM {{ vm.name }} experiencing high disk latency"
```

Memory swapping is marked as critical because it has immediate and severe performance impact. Memory ballooning is a warning because, while it indicates memory pressure, the performance impact is less severe than swapping.

## Monitoring Multiple vCenter Instances

If you have multiple vCenter instances (different data centers or environments), configure separate receiver instances:

```yaml
receivers:
  vcenter/dc1:
    endpoint: "https://vcenter-dc1.yourcompany.com"
    username: "otel-monitor@vsphere.local"
    password: "${env:VCENTER_DC1_PASSWORD}"
    collection_interval: 5m

  vcenter/dc2:
    endpoint: "https://vcenter-dc2.yourcompany.com"
    username: "otel-monitor@vsphere.local"
    password: "${env:VCENTER_DC2_PASSWORD}"
    collection_interval: 5m

service:
  pipelines:
    metrics:
      receivers: [vcenter/dc1, vcenter/dc2]
      processors: [resource, filter, batch]
      exporters: [otlp]
```

Use the resource processor to tag metrics with the data center or environment name so you can filter and compare them in your dashboards.

## Troubleshooting

If the collector cannot connect to vCenter, the most common issues are TLS certificate problems and authentication failures. For self-signed certificates, set `insecure_skip_verify: true` or provide the correct CA bundle. For authentication, make sure the user has the correct domain suffix (typically `@vsphere.local` for local accounts).

If metrics are missing or incomplete, check the vCenter statistics level. At level 1 (the default), only basic metrics are collected. Increasing to level 2 provides more detailed metrics. You can check and change the statistics level in the vCenter web client under Configure > General > Statistics.

If the collector uses too much memory when monitoring large environments (hundreds of hosts, thousands of VMs), increase the batch processor's send size and reduce the number of enabled metrics to only the ones you actively use.

## Conclusion

The vCenter receiver in the OpenTelemetry Collector gives you direct access to VMware infrastructure metrics without deploying additional monitoring agents on ESXi hosts or VMs. Focus on CPU contention, memory pressure (especially ballooning and swapping), disk latency, and datastore capacity. These four areas cover the most common VMware performance problems. With these metrics flowing into your observability platform, you can correlate application performance issues with the underlying virtualization infrastructure and pinpoint whether the problem is in your code or in the resources available to it.
