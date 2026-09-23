# How to Pre-Aggregate OpenTelemetry Metrics Across Service Instances in the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Metric

Description: Define the state and timing needed for service-wide metric aggregation, use Collector transforms within their actual boundaries, and avoid merging independent writers accidentally.

Removing `service.instance.id` from every resource does not create a service-wide metric. It creates several writers whose measurements can now share an identity. A Collector receiving independent OTLP requests needs more than label editing to combine those streams correctly.

The practical starting point is to distinguish a transformation of points already collected together from a stateful aggregation across independently arriving service instances. Standard batch and transform processors do not automatically provide the latter.

## Write the aggregation contract first

For a service-wide queue depth, decide which instances own disjoint queues and when their values should be considered current. For a request counter, decide the time interval covered by each contribution and how process restarts affect its baseline. For histograms, also establish compatible units and bucket representations.

An aggregation key might retain `service.name`, deployment environment, region, and tenant. Dropping instance identity from the output may be intentional, but that identity is still needed internally to recognize individual writers, expiry, and counter resets. The [OpenTelemetry data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) defines streams using resource, scope, metric, and point identity and describes the single-writer requirement.

Use a small contract table during design:

| Question | Example answer |
|---|---|
| Which measurements combine? | Disjoint checkout worker queues |
| Which labels survive? | Service, environment, region |
| What is the time boundary? | A coordinated snapshot collected every 30 seconds |
| What happens to a missing worker? | Mark coverage incomplete after a defined timeout |
| Who emits the combined stream? | One selected aggregation owner |

These are data semantics, not tuning parameters for the batching processor.

## Use transforms only for points already available together

The following example targets Collector Contrib **0.160.0**. Suppose an upstream snapshot collector has already produced one gauge metric object containing two worker points at the same observation time:

```text
Resource: service.name=checkout, deployment.environment.name=production
Metric: example.worker.queue.depth, Gauge
region=eu, worker=a, value=3
region=eu, worker=b, value=5
```

Within that controlled input, this processor combines the points into `region=eu, value=8`:

```yaml
processors:
  transform/queue_snapshot:
    error_mode: propagate
    metric_statements:
      - statements:
          - aggregate_on_attributes("sum", ["region"]) where metric.name == "example.worker.queue.depth" and metric.type == METRIC_DATA_TYPE_GAUGE
```

Attach the processor to your existing metrics pipeline. The attribute list selects the data point dimensions that remain. The function acts on the current metric object; it does not maintain a table of every instance's latest value across requests. Resource and scope groups also remain meaningful boundaries. [Tagged transform processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#aggregate_on_attributes)

This pattern is useful when the source owns a complete snapshot. It does not establish that snapshot by itself. If the two workers send separate OTLP requests directly, the result can be two independent partial totals.

## Do not use batching as a synchronization barrier

A batch processor improves transport efficiency. Arrival time does not establish that points cover the same interval, and batching thresholds do not guarantee every worker participates once.

Similarly, the metrics transform processor explicitly limits its aggregation to a batch and warns against using it to aggregate multiple independent sources. Increasing batch size cannot turn that processing contract into a distributed aggregation service. [Metrics transform processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/metricstransformprocessor/README.md)

Deleting resource identifiers and regrouping resources also does not resolve late arrivals, duplicate deliveries, missing workers, or different counter start times. A plausible value during a quiet staging test can conceal those failures until a rollout changes instance lifecycles.

## Place state where it can be maintained

For typical OTLP deployments, keep instance identity through the Collector and aggregate in a metrics backend designed to query many streams. Reduce unnecessary measurement attributes in SDK views so that each process emits fewer series while retaining independent stream ownership. [OpenTelemetry metric views](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#view)

For a Prometheus-compatible representation of request counters, a backend rollup can then calculate:

```promql
sum by (service_name, deployment_environment_name) (
  rate(http_requests_total[5m])
)
```

The metric and label names here are an example contract; check the actual backend translation and resource-attribute mapping. Instance counters remain separate until after their rates are calculated.

If aggregation must happen before storage, select or build a stateful component with explicit windowing and ownership. Route every contribution for an aggregation key to its owner, retain per-source progress, define late-data and expiry policies, and plan how state behaves during resharding or restart. A load balancer distributing arbitrary requests across Collector replicas does not provide those guarantees. [Collector scaling guidance](https://opentelemetry.io/docs/collector/scaling/)

## Verify the boundary with failure fixtures

Send two points in one metric object and confirm the expected sum. Then send the same points as two separate requests, as separate resources, and with different timestamps. Those experiments should make the transform's limited scope visible.

For a proposed stateful design, also restart one source, replay a delivery, delay one interval, remove a worker, and restart the aggregation owner. Check values, timestamps, resource identity, and completeness signals together. A reduction in exported point count is useful only when the resulting service measurement still has a precise meaning.
