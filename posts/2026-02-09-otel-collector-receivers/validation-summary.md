# Validation Summary: How to configure OpenTelemetry Collector receivers for metrics and traces

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and OTLP/JSON
- Prometheus receiver and Prometheus remote write exporter
- Host Metrics receiver
- Jaeger receiver and legacy Jaeger Python client
- Zipkin receiver
- Kafka receiver
- Kubelet Stats receiver
- Kubernetes attributes and resource detection processors
- Kubernetes `kubectl` troubleshooting commands

## Sources Consulted
- OpenTelemetry Collector receiver component list: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector Docker install example: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- Prometheus configuration and relabeling documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Host Metrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector Kubelet Stats receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry Collector Kubernetes Attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector Resource Detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry migration guidance for Jaeger clients: https://opentelemetry.io/docs/migration/

## Issues Found
- The OTLP example used the deprecated `logging` exporter and `loglevel` option. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The OTLP receiver example claimed to accept logs but only configured trace and metric pipelines. Added a logs pipeline using the same OTLP receiver and debug exporter.
- The commented OTLP receiver TLS block was placed at the receiver level instead of under the `grpc` or `http` protocol settings. Moved the commented TLS examples under each protocol.
- The OTLP test command used `grpcurl` with snake_case JSON fields. Replaced it with an OTLP/JSON `curl` request using lowerCamelCase field names, hex trace/span IDs, and string nanosecond timestamps per the OTLP JSON encoding rules.
- The Prometheus pod relabel rule used only the annotation port as input and produced an invalid address like `8080:8080`. Updated it to combine `__address__` with the annotated port and replace with host plus port.
- Prometheus relabel replacements containing `$` were not escaped for Collector configuration parsing. Escaped replacement values as `$$1`, `$$2`, etc.
- The Prometheus Remote Write exporter used the deprecated `prometheusremotewrite` component type. Updated it to `prometheus_remote_write` and adjusted the pipeline reference.
- Internal plaintext OTLP exporter examples omitted TLS settings. Added `tls.insecure: true` where examples send to `otel-gateway:4317` without a URL scheme.
- The Host Metrics receiver and Resource Detection processor used deprecated component aliases. Updated them to `host_metrics` and `resource_detection`.
- The Resource Detection processor listed `k8s`, which is not a current valid detector name. Removed it from the host metrics example rather than adding the extra `k8s_api` detector requirements.
- The Kafka receiver placed TLS under `auth.tls`, which is deprecated. Moved TLS to the receiver's top-level `tls` block.
- The Kubelet Stats receiver and Kubernetes Attributes processor used deprecated component aliases. Updated them to `kubelet_stats` and `k8s_attributes`.
- The Jaeger Python snippet was presented as a general migration example even though Jaeger client libraries are deprecated. Reworded it as a legacy client example for pointing existing clients at the Collector.

## Review Notes
- The Kubernetes snippets assume the Collector deployment supplies required RBAC and, for the kubelet stats example, the `K8S_NODE_NAME` environment variable via the Downward API. That operational setup is outside this post's snippets but is required in a real cluster.
- `tls.insecure: true` is appropriate for the internal plaintext examples shown here, but production deployments should use TLS certificates or an explicit secure endpoint.
