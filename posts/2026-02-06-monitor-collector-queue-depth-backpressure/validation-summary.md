# Validation Summary: How to Monitor Collector Queue Depth and Backpressure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry metrics
- Collector exporter sending queues and persistent queues
- Collector batch, memory limiter, attributes, filter, probabilistic sampler, and tail sampling processors
- Prometheus and PromQL
- Grafana dashboards
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes StatefulSets and persistent volumes
- Prometheus Adapter custom metrics

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporterhelper package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- Kubernetes HorizontalPodAutoscaler v2 API documentation: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes SIGs Prometheus Adapter documentation: https://github.com/kubernetes-sigs/prometheus-adapter

## Issues Found
- The queue architecture section described generic receiver, processor, exporter, and sending queues as separate built-in stages. Updated it to reflect the common Collector buffering points: batch processor buffers, exporter sending queues, and optional persistent sending queues.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `metrics.readers.pull.exporter.prometheus.host` and `port` configuration.
- Queue sizing examples treated `queue_size` as spans/items without setting a queue sizer. Added `sizer: items` where queue sizes are calculated from span rate, and clarified default queue capacity semantics.
- The processor metric example used deprecated `otelcol_processor_refused_spans`. Replaced it with current processor incoming/outgoing item metrics.
- The dashboard and runbook referenced nonexistent `otelcol_exporter_enqueue_sent_spans`. Replaced those queries with receiver accepted span rate and queue growth via `deriv(otelcol_exporter_queue_size[5m])`.
- The optimal queue configuration used `storage: memory`, which is not a valid storage extension reference. Removed it and clarified that omitting `storage` keeps the queue in memory.
- The memory limiter comments mislabeled `limit_mib` as the soft limit. Corrected the comments to explain the hard limit and the soft limit calculation.
- The Prometheus Adapter `metricsQuery` omitted adapter template variables required for resource-specific custom metrics. Updated it to use `<<.LabelMatchers>>` and `<<.GroupBy>>`.
- The attributes processor example placed a `match` block inside an action, which is not valid attributes processor config. Replaced it with a valid processor-level `include` filter.
- The filter processor example used an old/invalid nested `traces.span` shape. Replaced it with current `trace_conditions` and OTTL span attribute syntax.
- The persistent queue section called the feature experimental and implied data could not be lost. Reworded it to say persistent queues help telemetry survive collector restarts.
- The persistent queue Collector config referenced an `otlp` receiver without defining it. Added the receiver definition.
- The file storage extension example used storage and compaction directories that may not exist. Added `create_directory: true`.
- The Kubernetes persistent queue example used a three-replica Deployment with one `ReadWriteOnce` PVC. Replaced it with a StatefulSet using `volumeClaimTemplates` so each replica gets its own volume.
- The Kubernetes example used an outdated Collector image tag and did not pass a config path. Updated the image tag to `0.153.0` and added `--config=/conf/otel-collector-config.yaml`.

## Review Notes
The Collector internal telemetry schema and metric stability are still evolving. Future updates should re-check metric names, labels, and telemetry configuration against the Collector version used in the deployment.
