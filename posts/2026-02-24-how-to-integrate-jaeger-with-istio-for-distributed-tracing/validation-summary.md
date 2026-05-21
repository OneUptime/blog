# Validation Summary: How to Integrate Jaeger with Istio for Distributed Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Jaeger
- OpenTelemetry Protocol (OTLP)
- Zipkin trace ingestion
- Kubernetes Deployments, Services, CronJobs, Gateways, and VirtualServices
- Elasticsearch
- Kafka

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio trace sampling task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Jaeger v1.76 getting started: https://www.jaegertracing.io/docs/1.76/getting-started/
- Jaeger v1.76 deployment and storage documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger v1.76 performance tuning guide: https://www.jaegertracing.io/docs/1.76/performance-tuning/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Istio Bookinfo and sleep sample manifests: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/bookinfo/platform/kube/bookinfo.yaml and https://raw.githubusercontent.com/istio/istio/release-1.30/samples/sleep/sleep.yaml

## Issues Found
- The Jaeger architecture section listed Kafka as a trace storage backend alongside in-memory, Cassandra, and Elasticsearch. Jaeger documents Kafka as an intermediate buffer rather than the final backing store, so the wording now lists storage backends separately and describes Kafka as a buffer.
- The Jaeger image examples used `1.54`, which is an old v1 release. Updated the all-in-one, collector, query, and Elasticsearch index cleaner examples to `1.76.0`, the current documented v1 line.
- The Istio Zipkin tracing example set sampling in `meshConfig.defaultConfig.tracing.sampling` while also using Telemetry API sampling. Istio recommends Telemetry API sampling for this path, so the legacy tracing config is now disabled with `tracing: {}` and sampling is kept on the Telemetry resource.
- The Istio OpenTelemetry example did not explicitly disable legacy MeshConfig tracing options. Added `defaultConfig.tracing: {}` to match current Istio guidance for extension-provider tracing.
- The verification commands deployed Bookinfo but then executed traffic from `deploy/sleep`, which was never deployed. Added the Istio sleep sample deployment and updated the sample URLs to the current Istio `release-1.30` branch.
- The verification flow did not ensure the default namespace would receive sidecars before deploying samples. Added `kubectl label namespace default istio-injection=enabled --overwrite`.
- The troubleshooting connectivity command sent a GET request to the Zipkin spans ingestion endpoint. Replaced it with a POST of an empty JSON span list so the command exercises the correct endpoint method.
- The Kafka tuning snippet implied setting collector Kafka producer variables was enough for buffering. Added a note that `jaeger-ingester` must also run to consume from Kafka and write to the actual storage backend.

## Review Notes
The article remains a Jaeger v1-style deployment guide. Jaeger v2 is the latest major version and uses different packaging/configuration, so a future larger rewrite could modernize the post around Jaeger v2. The current fixes keep the existing structure intact while making the v1 examples accurate.
