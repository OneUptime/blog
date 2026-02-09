# How to Visualize OpenTelemetry Profiles as Flame Graphs and Icicle Charts in Grafana Pyroscope

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Grafana, Pyroscope

Description: Step-by-step guide to visualizing OpenTelemetry profiling data as flame graphs and icicle charts using Grafana Pyroscope.

Profiling data is only useful if you can actually make sense of it. Raw stack traces and sample counts are hard to interpret on their own. Flame graphs and icicle charts transform that data into visual representations that make it obvious where your application spends its time. Grafana Pyroscope is one of the best backends for storing and visualizing OpenTelemetry profiles.

## Setting Up Pyroscope to Receive OpenTelemetry Profiles

Pyroscope can ingest profiles via the OTLP protocol, which means it plugs directly into your OpenTelemetry Collector pipeline.

Start Pyroscope:

```bash
docker run --rm -d \
  --name pyroscope \
  -p 4040:4040 \
  grafana/pyroscope:1.7.0
```

Configure the OpenTelemetry Collector to export profiles to Pyroscope:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlphttp/pyroscope:
    endpoint: http://pyroscope:4040
    tls:
      insecure: true

service:
  pipelines:
    profiles:
      receivers: [otlp]
      exporters: [otlphttp/pyroscope]
```

## Understanding Flame Graphs

A flame graph stacks function calls vertically. The x-axis represents the proportion of samples where that function appeared, and the y-axis shows the call depth. Wider bars mean more time spent in that function (or its children).

Here is what to look for:

- **Wide bars at the top** indicate functions that consume a lot of CPU directly (self time).
- **Tall narrow towers** suggest deep call stacks, which might indicate excessive recursion or deeply nested abstractions.
- **Plateaus** where a parent function is wide but its children are narrow suggest the parent itself is doing significant work.

In Grafana, navigate to **Explore > Pyroscope** and select your application. Choose a time range and the profile type (cpu, memory, etc.). The flame graph renders automatically.

## Icicle Charts: The Inverted Perspective

An icicle chart is essentially a flame graph flipped upside down. The root function is at the top, and callees descend downward. Some engineers find this more intuitive because it mirrors the actual call flow: the entry point is at the top and execution flows downward.

In Pyroscope's UI, you can toggle between flame graph and icicle chart views with a single click. Both represent the same data, just oriented differently.

## Querying Specific Profiles

Pyroscope supports label-based queries. If your OpenTelemetry profiling agent tags profiles with resource attributes, you can filter by them:

```
process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="checkout-service"}
```

This query fetches CPU profiles specifically for the checkout service. You can add more label filters:

```
process_cpu:cpu:nanoseconds:cpu:nanoseconds{
  service_name="checkout-service",
  deployment_environment="production"
}
```

## Adding Pyroscope as a Grafana Data Source

If you are running Grafana separately from Pyroscope, add it as a data source:

```yaml
# grafana-datasources.yaml
apiVersion: 1
datasources:
  - name: Pyroscope
    type: grafana-pyroscope-datasource
    url: http://pyroscope:4040
    access: proxy
    isDefault: false
```

Once connected, you can build dashboards that combine flame graphs with metrics panels. For example, place a CPU utilization graph next to a flame graph for the same time window. When you see a CPU spike, click on that time range and the flame graph updates to show what was running during the spike.

## Comparing Two Time Ranges

One of the most powerful features is the comparison view. Select two time ranges, say before and after a deployment, and Pyroscope renders a diff flame graph. Functions that got slower appear in red, and functions that got faster appear in green.

```
# In the Pyroscope UI:
# 1. Select baseline time range (e.g., last Tuesday 14:00-15:00)
# 2. Select comparison time range (e.g., today 14:00-15:00)
# 3. Click "Compare"
```

This is incredibly useful for validating performance improvements or catching regressions.

## Embedding Flame Graphs in Grafana Dashboards

You can create dedicated profiling dashboards in Grafana:

```json
{
  "panels": [
    {
      "type": "flamegraph",
      "title": "CPU Profile - Checkout Service",
      "datasource": {
        "type": "grafana-pyroscope-datasource",
        "uid": "pyroscope-ds"
      },
      "targets": [
        {
          "profileTypeId": "process_cpu:cpu:nanoseconds:cpu:nanoseconds",
          "labelSelector": "{service_name=\"checkout-service\"}"
        }
      ]
    }
  ]
}
```

## Tips for Reading Flame Graphs Effectively

Start from the top of the flame graph (the widest bars). These represent the functions with the most cumulative time. Then look for the widest bars that do not have wide children. Those are the functions doing the actual work, and they are your best optimization targets.

Avoid getting distracted by deep but narrow towers. A function that appears in the call stack frequently but accounts for a tiny slice of total time is not worth optimizing.

Color coding in Pyroscope typically groups frames by package or module. This helps you quickly distinguish between your application code, standard library calls, and third-party dependencies. Most of the time, you want to focus on your own code, since that is what you can actually change.

Flame graphs and icicle charts turn profiling from a specialist skill into something any engineer on the team can use. Combined with OpenTelemetry's standardized profiling pipeline and Pyroscope's storage backend, you get a complete, accessible profiling workflow.
