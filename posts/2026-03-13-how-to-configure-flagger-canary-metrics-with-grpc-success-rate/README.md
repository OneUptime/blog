# How to Configure Flagger Canary Metrics with gRPC Success Rate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, canary, metrics, grpc, success rate, prometheus, kubernetes, progressive delivery

Description: Learn how to configure Flagger to evaluate gRPC success rate during canary analysis using custom MetricTemplates with Prometheus queries.

---

## Introduction

gRPC services use a different error signaling mechanism than HTTP-based APIs. Instead of HTTP status codes, gRPC uses its own set of status codes defined in the gRPC specification. A successful gRPC call returns status code `OK` (numeric value 0), while errors are indicated by codes like `INTERNAL`, `UNAVAILABLE`, or `DEADLINE_EXCEEDED`.

Flagger's built-in `request-success-rate` metric is designed for HTTP traffic and checks for non-5xx responses. For gRPC services, you need a custom MetricTemplate that queries gRPC-specific metrics and filters by gRPC status codes. This guide explains how to set up gRPC success rate metrics for canary analysis with Flagger.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A service mesh (Istio or Linkerd) with gRPC metrics enabled
- Prometheus deployed and scraping mesh metrics
- A gRPC service deployed as a Kubernetes Deployment with sidecar injection
- kubectl access to your cluster

## How gRPC Metrics Differ from HTTP Metrics

Service meshes like Istio and Linkerd export separate metric labels for gRPC traffic. In Istio, the `istio_requests_total` metric includes a `grpc_response_status` label for gRPC calls, alongside the standard `response_code` label. The HTTP response code for gRPC-over-HTTP/2 is typically 200 even when the gRPC call itself fails, so filtering by HTTP status code alone will miss gRPC errors.

Linkerd similarly tracks gRPC status codes through its `response_total` metric with a `grpc_status_code` label.

## Creating a gRPC Success Rate MetricTemplate for Istio

Here is a MetricTemplate that calculates gRPC success rate using Istio metrics in Prometheus:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: grpc-success-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    sum(rate(
      istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}",
        grpc_response_status="0"
      }[{{ interval }}]
    ))
    /
    sum(rate(
      istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}",
        grpc_response_status=~".*"
      }[{{ interval }}]
    ))
    * 100
```

This query divides the rate of successful gRPC calls (status 0) by the total rate of all gRPC calls, then multiplies by 100 to get a percentage. The `grpc_response_status="0"` filter selects only successful calls in the numerator. The denominator includes all gRPC calls regardless of status.

## Referencing the gRPC Metric in a Canary

Wire the MetricTemplate into your Canary resource:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-grpc-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-grpc-app
  service:
    port: 9090
    targetPort: 9090
    appProtocol: grpc
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: grpc-success-rate
        templateRef:
          name: grpc-success-rate
          namespace: default
        thresholdRange:
          min: 99
        interval: 1m
```

The `thresholdRange.min` of 99 means the gRPC success rate must be at least 99% for the metric check to pass. If fewer than 99% of gRPC calls succeed, Flagger counts it as a failed check.

Note the `appProtocol: grpc` field in the service spec. This tells the service mesh to treat traffic on this port as gRPC, which is necessary for correct metric labeling.

## Creating a gRPC Success Rate MetricTemplate for Linkerd

For Linkerd, the metric name and label structure differ:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: grpc-success-rate-linkerd
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.linkerd-viz:9090
  query: |
    sum(rate(
      response_total{
        namespace="{{ namespace }}",
        deployment="{{ target }}",
        direction="inbound",
        grpc_status_code="0"
      }[{{ interval }}]
    ))
    /
    sum(rate(
      response_total{
        namespace="{{ namespace }}",
        deployment="{{ target }}",
        direction="inbound",
        grpc_status_code=~".*"
      }[{{ interval }}]
    ))
    * 100
```

Linkerd uses `response_total` as the metric name and `grpc_status_code` as the label for gRPC status. The `direction="inbound"` filter ensures you are measuring traffic arriving at the canary pod rather than outbound calls it makes.

## Excluding Specific gRPC Status Codes

Not all non-zero gRPC status codes indicate a problem. For example, `NOT_FOUND` (status 5) might be expected for certain queries. You can exclude specific codes from your error calculation:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: grpc-success-rate-excluding-not-found
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    sum(rate(
      istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}",
        grpc_response_status=~"0|5"
      }[{{ interval }}]
    ))
    /
    sum(rate(
      istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}",
        grpc_response_status=~".*"
      }[{{ interval }}]
    ))
    * 100
```

Here, both status `0` (OK) and status `5` (NOT_FOUND) are counted as acceptable responses in the numerator.

## Combining gRPC Success Rate with Latency

For a thorough canary analysis, combine success rate with latency metrics:

```yaml
    metrics:
      - name: grpc-success-rate
        templateRef:
          name: grpc-success-rate
          namespace: default
        thresholdRange:
          min: 99
        interval: 1m
      - name: grpc-duration-p99
        templateRef:
          name: grpc-duration-p99
          namespace: default
        thresholdRange:
          max: 200
        interval: 1m
```

This requires both 99% gRPC success rate and P99 latency under 200 milliseconds. Both conditions must hold for the canary to advance.

## Handling the No-Traffic Edge Case

As with HTTP error rate metrics, gRPC queries can return `NaN` when there is no traffic. Use the `or vector(0)` pattern to handle this:

```yaml
  query: |
    (
      sum(rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}",
          grpc_response_status="0"
        }[{{ interval }}]
      ))
      /
      sum(rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}",
          grpc_response_status=~".*"
        }[{{ interval }}]
      ))
      * 100
    ) or vector(100)
```

Using `vector(100)` as the fallback treats no-traffic as 100% success, which prevents false rollbacks when traffic has not yet reached the canary.

## Conclusion

Configuring gRPC success rate metrics for Flagger canary analysis requires custom MetricTemplates because gRPC uses its own status codes rather than HTTP status codes. The core approach is querying Prometheus for the ratio of successful gRPC calls (status 0) to total gRPC calls, expressed as a percentage. Adjust the query to match your service mesh (Istio or Linkerd), exclude expected non-zero status codes if needed, and combine with latency metrics for comprehensive canary evaluation.
