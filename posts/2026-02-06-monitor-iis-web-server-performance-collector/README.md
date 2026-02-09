# How to Monitor IIS Web Server Performance with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, IIS, Windows, Web Server, Metrics, Performance, Observability

Description: Learn how to monitor Microsoft IIS web server performance using the OpenTelemetry Collector with Windows performance counters and custom pipelines.

---

Microsoft Internet Information Services (IIS) remains one of the most widely deployed web servers in enterprise environments. If you run .NET applications, SharePoint, or any Windows-based web stack, chances are IIS is somewhere in your infrastructure. Monitoring its performance is not optional. Slow response times, thread pool exhaustion, and request queue buildup can bring your applications to a crawl before anyone notices. The OpenTelemetry Collector gives you a straightforward way to pull IIS metrics into your observability platform without installing proprietary agents or locking yourself into a single vendor.

## Why Monitor IIS with OpenTelemetry?

Traditional IIS monitoring relies on Windows Performance Monitor (PerfMon) or System Center Operations Manager (SCOM). These tools work, but they tend to keep your data siloed. You end up with IIS metrics in one place, application traces in another, and logs scattered across Event Viewer. The OpenTelemetry Collector bridges this gap by collecting IIS performance counters and shipping them alongside your application telemetry to a unified backend.

The key benefits are simple. You get a single collection agent for all your telemetry. You can correlate IIS metrics with application-level traces. And you avoid vendor lock-in because OpenTelemetry is an open standard supported by dozens of backends.

## How IIS Performance Counters Work

IIS exposes its internal state through Windows Performance Counters. These are the same counters you would see in PerfMon, organized into counter sets like "Web Service", "ASP.NET", and "HTTP Service Request Queues". Each counter tracks a specific metric such as current connections, requests per second, or bytes transferred.

```mermaid
graph LR
    A[IIS Worker Process] -->|Exposes| B[Windows Performance Counters]
    B -->|Read by| C[OTel Collector]
    C -->|windowsperfcounters receiver| D[Metric Pipeline]
    D -->|Process & Export| E[OneUptime / Backend]
```

The OpenTelemetry Collector reads these counters using the Windows Performance Counters receiver, which is a component specifically built for pulling metrics from the Windows performance subsystem.

## Prerequisites

Before you begin, make sure you have the following in place.

Your IIS server should be running on Windows Server 2016 or later. The OpenTelemetry Collector Contrib distribution must be installed, since the `windowsperfcounters` receiver is part of the contrib package, not the core distribution. You also need administrative access to the server, because reading performance counters requires elevated privileges.

Install the collector as a Windows service so it starts automatically:

```powershell
# Download the OpenTelemetry Collector Contrib for Windows
# Replace the version with the latest available
Invoke-WebRequest -Uri "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.96.0/otelcol-contrib_0.96.0_windows_amd64.tar.gz" -OutFile otelcol-contrib.tar.gz

# Extract and install
tar -xzf otelcol-contrib.tar.gz

# Register as a Windows service
sc.exe create "OpenTelemetry Collector" binPath= "C:\otelcol\otelcol-contrib.exe --config C:\otelcol\config.yaml" start= auto
```

## Configuring the Collector for IIS Metrics

The heart of this setup is the `windowsperfcounters` receiver. This receiver lets you define which performance counter sets to scrape and how often to collect them. Here is a complete configuration that covers the most important IIS metrics:

```yaml
# config.yaml - OpenTelemetry Collector configuration for IIS monitoring
receivers:
  windowsperfcounters:
    collection_interval: 30s
    perfcounters:
      # Core IIS Web Service counters
      - object: "Web Service"
        instances: ["*"]
        counters:
          - name: "Current Connections"
            # Number of active connections to the web service
          - name: "Total Bytes Received"
            # Cumulative bytes received since service start
          - name: "Total Bytes Sent"
            # Cumulative bytes sent since service start
          - name: "Total Connection Attempts (all instances)"
            # Total connection attempts across all sites
          - name: "Total Get Requests"
            # Total HTTP GET requests served
          - name: "Total Post Requests"
            # Total HTTP POST requests served
          - name: "Total Method Requests/sec"
            # Request throughput across all HTTP methods

      # ASP.NET application performance counters
      - object: "ASP.NET"
        counters:
          - name: "Requests Queued"
            # Requests waiting in the ASP.NET queue
          - name: "Requests Rejected"
            # Requests rejected due to full queue
          - name: "Request Execution Time"
            # Time in milliseconds to execute the most recent request
          - name: "Worker Process Restarts"
            # Number of times the worker process has restarted

      # ASP.NET application-level counters
      - object: "ASP.NET Applications"
        instances: ["*"]
        counters:
          - name: "Requests/Sec"
            # Request rate per application
          - name: "Errors Total/Sec"
            # Error rate per application
          - name: "Request Wait Time"
            # Time the most recent request waited in queue

      # HTTP request queue depth
      - object: "HTTP Service Request Queues"
        instances: ["*"]
        counters:
          - name: "CurrentQueueSize"
            # Number of requests currently in the HTTP.sys queue
          - name: "RejectedRequests"
            # Requests rejected because the queue was full

processors:
  # Batch telemetry to reduce export overhead
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Add resource attributes identifying this server
  resource:
    attributes:
      - key: host.name
        from_attribute: ""
        action: upsert
      - key: service.name
        value: "iis-web-server"
        action: upsert

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics:
      receivers: [windowsperfcounters]
      processors: [batch, resource]
      exporters: [otlp]
```

Let me walk through the key sections. The `perfcounters` list defines four counter objects. The "Web Service" object tracks connection counts, throughput, and request volumes per IIS site. The "ASP.NET" object gives you queue depths and execution times at the framework level. The "ASP.NET Applications" object breaks those down per application. And the "HTTP Service Request Queues" object monitors the kernel-mode HTTP.sys queue, which is the first place requests land before IIS even touches them.

The `instances: ["*"]` setting tells the receiver to collect counters for all IIS sites or all applications. If you only want to monitor a specific site, you can replace the wildcard with the site name.

## Adding IIS Log Collection

Performance counters are great for metrics, but you also want IIS access logs for request-level visibility. The OpenTelemetry Collector can tail IIS log files using the `filelog` receiver:

```yaml
receivers:
  # Add this alongside the windowsperfcounters receiver
  filelog:
    include:
      # Default IIS log directory
      - "C:\\inetpub\\logs\\LogFiles\\W3SVC*\\*.log"
    start_at: end
    # Skip IIS log file comment lines that start with #
    operators:
      - type: filter
        expr: 'body startsWith "#"'
      - type: regex_parser
        # Parse W3C extended log format
        regex: '(?P<date>\S+)\s+(?P<time>\S+)\s+(?P<s_ip>\S+)\s+(?P<cs_method>\S+)\s+(?P<cs_uri_stem>\S+)\s+(?P<cs_uri_query>\S+)\s+(?P<s_port>\d+)\s+(?P<cs_username>\S+)\s+(?P<c_ip>\S+)\s+(?P<cs_user_agent>\S+)\s+(?P<cs_referer>\S+)\s+(?P<sc_status>\d+)\s+(?P<sc_substatus>\d+)\s+(?P<sc_win32_status>\d+)\s+(?P<time_taken>\d+)'
        timestamp:
          parse_from: attributes.date
          layout: "%Y-%m-%d"

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [batch, resource]
      exporters: [otlp]
```

The regex parser here handles the default W3C extended log format that IIS uses. It extracts the HTTP method, URI, status code, client IP, and response time into structured attributes. This makes it much easier to query and filter logs in your backend.

## Key Metrics to Watch

Not all IIS counters are equally important. Here are the ones that matter most for day-to-day operations.

**Request Queue Size** is your early warning system. When requests start piling up in the HTTP.sys queue or the ASP.NET queue, it means your application cannot keep up with incoming traffic. A sustained queue above zero is a problem.

**Requests per Second** tells you your throughput. Track this over time to establish baselines. A sudden drop can indicate an upstream issue or a deployment that introduced a performance regression.

**Current Connections** shows how many clients are actively connected. A spike might mean a traffic surge, but it could also mean connections are not being closed properly, which points to a resource leak.

**Error Rate** through the "Errors Total/Sec" counter catches 500-level errors at the application level. Even a small error rate can represent a significant number of failed requests at scale.

**Request Execution Time** measures how long requests take to process. This is different from the time-taken field in IIS logs, which includes network transfer time. The execution time counter focuses on server-side processing.

## Setting Up Alerts

With metrics flowing into your backend, you should set up alerts for the conditions that matter most:

```yaml
# Example alert thresholds for IIS monitoring
# Configure these in your alerting platform

# Alert when request queue exceeds threshold
# Metric: ASP.NET / Requests Queued
# Condition: > 10 for 5 minutes
# Severity: Warning

# Alert when error rate spikes
# Metric: ASP.NET Applications / Errors Total/Sec
# Condition: > 5 for 2 minutes
# Severity: Critical

# Alert when queue rejection occurs
# Metric: HTTP Service Request Queues / RejectedRequests
# Condition: > 0 (any rejection)
# Severity: Critical
```

Queue rejections deserve immediate attention because they mean clients are receiving 503 errors. This is IIS telling you that the server is completely overwhelmed.

## Troubleshooting Common Issues

If you are not seeing metrics after starting the collector, check these common problems first.

The most frequent issue is permissions. The collector service must run under an account that has access to read performance counters. The "Performance Monitor Users" group in Windows controls this access. Add the service account to this group and restart the collector.

Another common problem is counter names that do not match. Performance counter names are localized in Windows, so on a non-English installation, the counter names will be different. You can list available counters by running `typeperf -q "Web Service"` in an elevated command prompt.

If counters exist but return zero values, verify that IIS is actually serving traffic and that the specific site or application pool is running. Stopped application pools will not generate performance data.

## Conclusion

Monitoring IIS with the OpenTelemetry Collector brings your Windows web server telemetry into the same pipeline as the rest of your infrastructure. The `windowsperfcounters` receiver handles the heavy lifting of reading Windows performance data, and the `filelog` receiver captures IIS access logs for request-level analysis. Together, they give you comprehensive visibility into IIS performance without any proprietary tooling. Once your metrics are flowing, focus your alerting on queue depth, error rates, and request throughput to catch problems before they affect your users.
