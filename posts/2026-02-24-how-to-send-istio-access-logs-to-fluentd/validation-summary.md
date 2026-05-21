# Validation Summary: How to Send Istio Access Logs to Fluentd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio access logging
- Istio Telemetry API
- IstioOperator mesh configuration
- Envoy access log formatting
- Kubernetes node-level logging
- Fluentd tail input, parser, grep, relabel, copy, buffer, and monitor_agent plugins
- Fluentd Kubernetes metadata filter
- Fluentd Elasticsearch, S3, and Kafka output plugins

## Sources Consulted
- Istio Envoy access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API access log task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio MeshConfig reference for accessLogFile, accessLogEncoding, extensionProviders, and LogFormat: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Fluentd tail input plugin documentation: https://docs.fluentd.org/input/tail
- Fluentd relabel output plugin documentation: https://docs.fluentd.org/output/relabel
- Fluentd Elasticsearch output plugin documentation: https://docs.fluentd.org/output/elasticsearch
- Fluentd grep and record_transformer guide: https://docs.fluentd.org/how-to-guides/filter-modify-apache
- Fluentd monitor_agent input plugin documentation: https://docs.fluentd.org/input/monitor_agent
- fluent-plugin-kubernetes_metadata_filter documentation: https://github.com/fluent-plugins-nursery/fluent-plugin-kubernetes_metadata_filter
- fluent-plugin-sampling-filter documentation: https://rubygems.org/gems/fluent-plugin-sampling-filter

## Issues Found
- The custom Istio access log provider was defined under `meshConfig.extensionProviders`, but no Telemetry resource selected it. Added a `telemetry.istio.io/v1` `Telemetry` resource that enables the `json-stdout` provider.
- The Fluentd tail inputs parsed `/var/log/containers/*.log` as Docker JSON envelopes. Kubernetes logging is standardized around CRI log lines, so the examples now parse the CRI timestamp, stream, log tag, and message before parsing the nested Istio JSON or text log.
- The Fluentd tag was `istio.access`, which prevents the Kubernetes metadata filter from deriving pod, namespace, and container metadata from the container log filename. Changed the source tag to `kubernetes.*` and adjusted matching filters/routes to `kubernetes.**`.
- The error-only Elasticsearch output placed a `<filter>` block inside a `copy` output `<store>`, which is not valid Fluentd routing. Reworked it to use the core `relabel` output and a labeled pipeline with a `grep` filter before the error Elasticsearch match.
- The Elasticsearch examples combined `index_name` with `logstash_format true`; Fluentd's Elasticsearch plugin ignores `index_name` when `logstash_format` is enabled. Removed the misleading `index_name` entries and kept `logstash_prefix`.
- The default Istio text-format parser omitted the trailing fields in Istio's documented default access log format. Expanded the regex to include upstream local address, downstream addresses, requested server name, and route name.
- The sampling example used an unverified nested filter structure and the wrong parameter name. Updated it to a labeled pipeline and documented that it requires `fluent-plugin-sampling-filter`, using `interval` and `sample_unit`.

## Review Notes
The examples are now technically aligned with current Istio, Kubernetes, and Fluentd behavior. Operators may still need to adjust timestamp parsing if their container runtime emits CRI timestamps with offsets instead of `Z`, and Elasticsearch 8 deployments may require plugin-specific settings around document types.
