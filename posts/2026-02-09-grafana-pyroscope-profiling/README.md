# How to use Grafana Pyroscope for continuous profiling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Pyroscope, Profiling

Description: Learn how to implement continuous profiling with Grafana Pyroscope to identify performance bottlenecks and optimize application resource usage.

---

Traditional profiling tools require manual intervention to capture snapshots during performance issues, which means you miss intermittent problems. Grafana Pyroscope provides continuous profiling that runs all the time, capturing performance data automatically so you can investigate issues after they occur. This turns profiling from a reactive debugging tool into a proactive monitoring system.

## Understanding Continuous Profiling

Continuous profiling collects data about where your applications spend CPU time and allocate memory. Unlike traditional profilers that you run manually for short periods, continuous profiling runs constantly with minimal overhead, typically less than 2-3% CPU usage.

Pyroscope stores profiling data over time, allowing you to compare profiles across deployments, correlate performance changes with code changes, and identify gradual performance degradation.

## Installing Pyroscope Server

Start with a standalone Pyroscope server for development and testing.

```yaml
# docker-compose.yml

version: '3.8'

services:
  pyroscope:
    image: grafana/pyroscope:latest
    ports:
      - "4040:4040"
    volumes:
      - pyroscope-data:/data
    command:
      - "-pyroscopedb.data-path=/data"
      - "-storage.filesystem.dir=/data/v2/shared"
      - "-log.level=info"

volumes:
  pyroscope-data:
```

Pyroscope will be available at http://localhost:4040 with a built-in UI for viewing profiles.

## Configuring Pyroscope Server

Create a configuration file for production deployments with object storage.

```yaml
# config.yaml
server:
  http_listen_port: 4040

storage:
  backend: s3
  s3:
    bucket_name: pyroscope-profiles
    endpoint: s3.amazonaws.com
    region: us-east-1

limits:
  # Maximum flame graph nodes returned by default
  max_flamegraph_nodes_default: 8192

  # Retention period
  compactor_blocks_retention_period: 720h  # 30 days

analytics:
  reporting_enabled: false
```

This configuration stores profiles in S3 for long-term retention and analysis.

## Instrumenting Go Applications

Add Pyroscope instrumentation to your Go applications with minimal code changes.

```go
// main.go
package main

import (
    "log"
    "time"

    "github.com/grafana/pyroscope-go"
)

func main() {
    // Start profiling
    profiler, err := pyroscope.Start(pyroscope.Config{
        ApplicationName: "my-application",
        ServerAddress:   "http://pyroscope:4040",

        // Enable all profile types
        ProfileTypes: []pyroscope.ProfileType{
            pyroscope.ProfileCPU,
            pyroscope.ProfileAllocObjects,
            pyroscope.ProfileAllocSpace,
            pyroscope.ProfileInuseObjects,
            pyroscope.ProfileInuseSpace,
        },

        // Add tags for filtering
        Tags: map[string]string{
            "env":     "production",
            "version": "1.0.0",
            "region":  "us-east-1",
        },

        // Upload interval
        UploadRate: 15 * time.Second,
    })

    if err != nil {
        log.Fatal(err)
    }
    defer profiler.Stop()

    // Your application code
    startServer()
}
```

The profiler runs in the background, collecting and uploading samples automatically.

## Profiling Python Applications

Instrument Python applications using the Pyroscope Python SDK.

```python
# app.py
import pyroscope

# Configure Pyroscope
pyroscope.configure(
    application_name="python-app",
    server_address="http://pyroscope:4040",
    tags={
        "env": "production",
        "version": "1.0.0",
    },
    # Enable profiling types
    detect_subprocesses=True,
    oncpu=True,
    gil_only=True,
)

# Your application code
from flask import Flask

app = Flask(__name__)

@app.route("/api/data")
def get_data():
    # Pyroscope automatically profiles this code
    result = expensive_computation()
    return {"data": result}

def expensive_computation():
    # This function's CPU usage will be visible in profiles
    total = 0
    for i in range(1000000):
        total += i * i
    return total

if __name__ == "__main__":
    app.run()
```

Pyroscope captures CPU time spent in each function automatically.

## Instrumenting Java Applications

Add Pyroscope to Java applications using the Java agent.

```bash
# Download the Pyroscope Java agent
wget https://github.com/grafana/pyroscope-java/releases/latest/download/pyroscope.jar

# Run your application with the agent
java -javaagent:pyroscope.jar \
  -Dpyroscope.application.name=java-app \
  -Dpyroscope.server.address=http://pyroscope:4040 \
  -Dpyroscope.format=jfr \
  -Dpyroscope.profiler.event=cpu \
  -Dpyroscope.profiler.alloc=512k \
  -jar application.jar
```

For containerized applications, add the agent to your Dockerfile:

```dockerfile
# Dockerfile
FROM openjdk:17-slim

# Download Pyroscope agent
RUN wget -O /app/pyroscope.jar \
    https://github.com/grafana/pyroscope-java/releases/latest/download/pyroscope.jar

COPY target/app.jar /app/app.jar

CMD ["java", \
     "-javaagent:/app/pyroscope.jar", \
     "-Dpyroscope.application.name=java-app", \
     "-Dpyroscope.server.address=http://pyroscope:4040", \
     "-jar", "/app/app.jar"]
```

## Using Push vs Pull Mode

Pyroscope supports both push mode (application sends profiles) and pull mode (Pyroscope scrapes profiles).

For pull mode, expose pprof endpoints in your Go application:

```go
// server.go
package main

import (
    "net/http"
    _ "net/http/pprof"
)

func main() {
    // pprof endpoints automatically registered
    go func() {
        http.ListenAndServe(":6060", nil)
    }()

    // Your application
    startApplication()
}
```

Configure Grafana Alloy to scrape the endpoint and forward profiles to Pyroscope:

```alloy
# config.alloy
pyroscope.scrape "my_application" {
  targets = [
    {"__address__" = "app-1:6060", "service_name" = "my-application", "env" = "production"},
    {"__address__" = "app-2:6060", "service_name" = "my-application", "env" = "production"},
    {"__address__" = "app-3:6060", "service_name" = "my-application", "env" = "production"},
  ]
  forward_to = [pyroscope.write.local.receiver]
}

pyroscope.write "local" {
  endpoint {
    url = "http://pyroscope:4040"
  }
}
```

Pull mode centralizes configuration and works well for large fleets of services.

## Analyzing Flame Graphs

Pyroscope displays profiles as flame graphs that show the call stack hierarchy.

```text
# Reading a flame graph:
- Width = time spent (wider = more CPU)
- Height = call stack depth
- Color = different functions (consistent per function)

# Common patterns to look for:
- Wide bars = hot functions consuming significant CPU
- Deep stacks = complex call chains that might be optimized
- Unexpected functions = code that shouldn't be in hot path
```

Click on any frame to zoom in and see details about that function and its callees.

## Comparing Profiles Over Time

Use comparison mode to understand how performance changed between deployments or time periods.

```bash
# Via API - compare two time ranges
curl "http://pyroscope:4040/pyroscope/render?query=process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name=\"my-app\"}&from=now-2h&until=now-1h&format=json" > before.json
curl "http://pyroscope:4040/pyroscope/render?query=process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name=\"my-app\"}&from=now-1h&until=now&format=json" > after.json

# Pyroscope UI provides visual diff showing:
# - Green = functions that decreased in CPU usage
# - Red = functions that increased in CPU usage
# - Gray = unchanged
```

Diff mode highlights exactly which functions changed between versions.

## Filtering Profiles with Tags

Use tags to slice profiling data by different dimensions.

```go
// Add dynamic tags at runtime
pyroscope.TagWrapper(context.Background(), pyroscope.Labels(
    "endpoint", "/api/data",
    "customer_tier", "premium",
), func(ctx context.Context) {
    // Code profiled with these tags
    handleRequest(ctx)
})
```

Query specific tag combinations:

```text
# View profiles for specific endpoint
process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="my-app", endpoint="/api/data"}

# Compare performance across customer tiers
process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="my-app", customer_tier="premium"} vs process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="my-app", customer_tier="free"}

# Filter by version
process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="my-app", version="1.0.0"}
```

Tags enable precise analysis of performance variations across dimensions.

## Integrating Pyroscope with Grafana

Connect Pyroscope to Grafana for unified observability.

```yaml
# grafana/datasource.yaml
apiVersion: 1

datasources:
  - name: Pyroscope
    type: grafana-pyroscope-datasource
    access: proxy
    url: http://pyroscope:4040
    isDefault: false
    editable: true
```

Create dashboards that combine profiles with metrics and traces:

```json
{
  "panels": [
    {
      "title": "CPU Profile",
      "type": "flamegraph",
      "datasource": "Pyroscope",
      "targets": [
        {
          "profileTypeId": "process_cpu:cpu:nanoseconds:cpu:nanoseconds",
          "labelSelector": "{service_name=\"my-app\"}",
          "groupBy": []
        }
      ]
    }
  ]
}
```

## Correlating Profiles with Traces

Link profiling data to distributed traces for complete request analysis.

```go
// Go application with tracing and profiling
import (
    "context"

    "github.com/grafana/pyroscope-go"
)

func handleRequest(ctx context.Context) {
    // Start trace span
    ctx, span := tracer.Start(ctx, "handle-request")
    defer span.End()

    // Add profile labels matching trace context
    traceID := span.SpanContext().TraceID().String()
    pyroscope.TagWrapper(ctx, pyroscope.Labels(
        "trace_id", traceID,
    ), func(ctx context.Context) {
        // Process request
        processData(ctx)
    })
}
```

Use Grafana's traces-to-profiles integration to correlate trace spans with profiling data for specific requests.

## Monitoring Memory Allocations

Track memory allocations to identify memory leaks and optimization opportunities.

```go
// Enable allocation profiling
profiler, err := pyroscope.Start(pyroscope.Config{
    ApplicationName: "my-app",
    ServerAddress:   "http://pyroscope:4040",
    ProfileTypes: []pyroscope.ProfileType{
        pyroscope.ProfileAllocObjects,  // Count of allocations
        pyroscope.ProfileAllocSpace,    // Bytes allocated
        pyroscope.ProfileInuseObjects,  // Live objects
        pyroscope.ProfileInuseSpace,    // Live object bytes
    },
})
```

View allocation profiles in Pyroscope UI to find code that allocates excessively.

## Setting Up Alerts on Profile Changes

Create alerts when profile patterns change significantly.

```promql
# After creating a recording rule from profile data, alert when CPU usage increases
rate(my_app_cpu_seconds_total{function="expensiveOperation"}[5m]) > 100

# Alert when allocation rate spikes
rate(my_app_alloc_bytes_total[5m]) > 10000000
```

Recording rules export selected profile data as metrics, which you can then use in Grafana alert rules.

## Best Practices for Continuous Profiling

Enable profiling in production, not just development. The overhead is minimal and the insights are invaluable.

Use meaningful application names and tags to make profiles easy to find and filter.

Start with CPU profiling first, then add memory profiling once you understand the basics.

Compare profiles before and after deployments to catch performance regressions immediately.

Look for unexpected functions in hot paths. These often indicate bugs or architectural issues.

Profile realistic workloads. Synthetic load tests might not trigger the same code paths as production traffic.

Keep profiles for at least 30 days to enable historical analysis and trend identification.

Combine profiling with metrics and traces for complete performance analysis. Each observability signal provides different insights.

Review profiles regularly during performance reviews and incident postmortems to build team proficiency.

Continuous profiling with Pyroscope transforms performance optimization from guesswork into data-driven engineering. It reveals exactly where your applications spend time and resources, making optimization efforts targeted and effective.
