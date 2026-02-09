# How to Collect Windows Performance Counters with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Windows, Performance Counters, Monitoring, Infrastructure, Observability

Description: Learn how to collect Windows Performance Counters using the OpenTelemetry Collector's windowsperfcounters receiver with practical configuration and examples.

---

Windows Performance Counters are the native mechanism for monitoring system and application metrics on Windows. They cover everything from CPU utilization and memory usage to IIS request rates, .NET CLR statistics, and SQL Server query performance. The OpenTelemetry Collector includes a dedicated `windowsperfcounters` receiver that reads these counters and translates them into OpenTelemetry metrics, making it possible to unify Windows monitoring with the rest of your observability pipeline.

This guide covers how to install the collector on Windows, configure the windowsperfcounters receiver, select the right counters for your workloads, and handle common pitfalls.

## How Windows Performance Counters Work

Windows organizes performance data into a hierarchy of objects, counters, and instances. An object represents a category like `Processor` or `Memory`. Each object contains counters like `% Processor Time` or `Available MBytes`. When an object has multiple instances (like individual CPU cores or disk volumes), each instance reports its own counter values.

The OpenTelemetry Collector reads these counters using the Windows PDH (Performance Data Helper) API, the same mechanism that PowerShell's `Get-Counter` and the Performance Monitor GUI use under the hood.

```mermaid
flowchart LR
    A["Windows PDH API"] --> B["windowsperfcounters receiver"]
    B --> C["OpenTelemetry Metrics"]
    C --> D["Processor Pipeline"]
    D --> E["OTLP Exporter"]
    E --> F["Observability Backend"]
```

## Installing the Collector on Windows

Download the Collector Contrib distribution for Windows from the official releases page. The MSI installer handles service registration automatically.

```powershell
# Download the Collector Contrib MSI installer
Invoke-WebRequest -Uri "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.96.0/otelcol-contrib_0.96.0_windows_amd64.msi" -OutFile "otelcol-contrib.msi"

# Install the collector as a Windows service
msiexec /i otelcol-contrib.msi /quiet
```

After installation, the collector runs as a Windows service named `otelcol-contrib`. The default configuration file is located at `C:\Program Files\OpenTelemetry Collector Contrib\config.yaml`.

## Basic Configuration

Here is a minimal configuration that collects common system performance counters:

```yaml
# C:\Program Files\OpenTelemetry Collector Contrib\config.yaml
receivers:
  windowsperfcounters:
    # Scrape performance counters every 30 seconds
    collection_interval: 30s
    metrics:
      # CPU utilization across all processors
      processor.time:
        description: "Percentage of CPU time in use"
        unit: "%"
        gauge:
      # Available physical memory in megabytes
      memory.available:
        description: "Available physical memory"
        unit: "MB"
        gauge:
      # Current disk queue length
      disk.queue:
        description: "Current disk queue length"
        unit: "{requests}"
        gauge:
    perfcounters:
      # Processor counters for overall CPU usage
      - object: "Processor"
        instances: ["_Total"]
        counters:
          - name: "% Processor Time"
            metric: processor.time
      # Memory counters
      - object: "Memory"
        counters:
          - name: "Available MBytes"
            metric: memory.available
      # Physical disk counters
      - object: "PhysicalDisk"
        instances: ["_Total"]
        counters:
          - name: "Current Disk Queue Length"
            metric: disk.queue

processors:
  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "otel-backend.example.com:4317"

service:
  pipelines:
    metrics:
      receivers: [windowsperfcounters]
      processors: [batch]
      exporters: [otlp]
```

The configuration has two main sections within the receiver. The `metrics` section defines the OpenTelemetry metric names, descriptions, units, and types. The `perfcounters` section maps Windows Performance Counter objects, instances, and counter names to those metric definitions.

## Discovering Available Counters

Windows has hundreds of performance counter objects, and installed applications add their own. To find out which counters are available on a given machine, use PowerShell:

```powershell
# List all available performance counter categories
Get-Counter -ListSet * | Select-Object CounterSetName | Sort-Object CounterSetName

# List all counters in a specific category
Get-Counter -ListSet "Processor" | Select-Object -ExpandProperty Paths

# Sample a specific counter to verify it works
Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 3
```

These commands help you identify the exact object names, instance names, and counter names to use in the collector configuration. Counter names are locale-specific on older Windows versions, so always verify on the target machine.

## Monitoring IIS Web Servers

If your Windows server runs IIS, the web service counters provide insight into request throughput, connection counts, and error rates:

```yaml
receivers:
  windowsperfcounters:
    collection_interval: 30s
    metrics:
      iis.requests_per_sec:
        description: "HTTP requests per second"
        unit: "{requests}/s"
        gauge:
      iis.current_connections:
        description: "Current active connections"
        unit: "{connections}"
        gauge:
      iis.bytes_total_per_sec:
        description: "Total bytes transferred per second"
        unit: "By/s"
        gauge:
      iis.not_found_errors:
        description: "Total 404 Not Found errors"
        unit: "{errors}"
        sum:
    perfcounters:
      # IIS Web Service counters
      - object: "Web Service"
        instances: ["_Total"]
        counters:
          # Tracks the rate of incoming HTTP requests
          - name: "Total Method Requests/sec"
            metric: iis.requests_per_sec
          # Number of currently active connections
          - name: "Current Connections"
            metric: iis.current_connections
          # Bytes sent and received per second
          - name: "Bytes Total/sec"
            metric: iis.bytes_total_per_sec
          # Count of 404 responses, useful for detecting broken links
          - name: "Not Found Errors"
            metric: iis.not_found_errors
```

You can replace `_Total` with specific site names to monitor individual IIS websites separately. The instance names correspond to the site names as configured in IIS Manager.

## Monitoring .NET Applications

.NET applications expose CLR performance counters for garbage collection, exceptions, and thread pool usage:

```yaml
receivers:
  windowsperfcounters:
    collection_interval: 30s
    metrics:
      dotnet.gc.time:
        description: "Percentage of time spent in garbage collection"
        unit: "%"
        gauge:
      dotnet.gc.heap_size:
        description: "Total bytes in managed heap across all generations"
        unit: "By"
        gauge:
      dotnet.exceptions_per_sec:
        description: "Rate of .NET exceptions thrown"
        unit: "{exceptions}/s"
        gauge:
      dotnet.thread_count:
        description: "Current number of .NET threads"
        unit: "{threads}"
        gauge:
    perfcounters:
      # .NET CLR Memory counters
      - object: ".NET CLR Memory"
        instances: ["_Global_"]
        counters:
          # Time spent in GC as a percentage of total time
          - name: "% Time in GC"
            metric: dotnet.gc.time
          # Total heap size across Gen 0, 1, 2, and LOH
          - name: "# Bytes in all Heaps"
            metric: dotnet.gc.heap_size
      # .NET CLR Exceptions
      - object: ".NET CLR Exceptions"
        instances: ["_Global_"]
        counters:
          # Rate of exceptions, useful for detecting error spikes
          - name: "# of Exceps Thrown / sec"
            metric: dotnet.exceptions_per_sec
      # .NET CLR LocksAndThreads
      - object: ".NET CLR LocksAndThreads"
        instances: ["_Global_"]
        counters:
          - name: "# of current logical Threads"
            metric: dotnet.thread_count
```

Replace `_Global_` with specific application process names to monitor individual .NET applications. The instance name matches the process name as it appears in Task Manager.

## Collecting Per-Instance Metrics

Many counter objects have multiple instances. For example, `PhysicalDisk` has one instance per disk, and `Network Interface` has one per NIC. You can use wildcards to collect all instances:

```yaml
receivers:
  windowsperfcounters:
    collection_interval: 30s
    metrics:
      disk.read_per_sec:
        description: "Disk read bytes per second"
        unit: "By/s"
        gauge:
      disk.write_per_sec:
        description: "Disk write bytes per second"
        unit: "By/s"
        gauge:
    perfcounters:
      - object: "PhysicalDisk"
        # Wildcard collects all disk instances individually
        instances: ["*"]
        counters:
          - name: "Disk Read Bytes/sec"
            metric: disk.read_per_sec
          - name: "Disk Write Bytes/sec"
            metric: disk.write_per_sec
```

When using `*` for instances, the collector creates a separate time series per instance, with the instance name as a metric attribute. This is useful for identifying which specific disk or network adapter is causing problems, but it increases cardinality. Use specific instance names or `_Total` if you only need aggregate values.

## Adding Host Resource Attributes

Just like on Linux, you should attach host identity information to metrics for multi-host environments:

```yaml
processors:
  # Detect and attach Windows host attributes
  resourcedetection:
    detectors: [system, env]
    system:
      hostname_sources: ["os"]
      resource_attributes:
        host.name:
          enabled: true
        host.id:
          enabled: true
        os.type:
          enabled: true

  batch:
    timeout: 10s

service:
  pipelines:
    metrics:
      receivers: [windowsperfcounters]
      processors: [resourcedetection, batch]
      exporters: [otlp]
```

## Troubleshooting Common Issues

**Counter not found errors**: If the collector logs errors about missing counters, verify the counter exists on the target machine using `Get-Counter -ListSet`. Counter names vary between Windows versions and depend on installed roles and features.

**Permission denied**: The collector service must run under an account with permission to read performance counters. The default `Local System` account works for most counters. Some application-specific counters may require the service to run as a domain account or a user in the `Performance Monitor Users` group.

**Localized counter names**: On non-English Windows installations, performance counter names may be in the local language. The collector uses the English names by default. If you encounter issues, check the registry key `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Perflib` for the correct localized names.

## Wrap Up

The windowsperfcounters receiver brings the full depth of Windows performance monitoring into the OpenTelemetry ecosystem. Whether you are tracking system-level CPU and memory, monitoring IIS web servers, profiling .NET CLR behavior, or watching SQL Server query performance, the receiver provides a consistent configuration model that maps native Windows counters to standardized OpenTelemetry metrics. Combined with resource detection, batching, and OTLP export, it integrates Windows infrastructure monitoring into your unified observability platform.
