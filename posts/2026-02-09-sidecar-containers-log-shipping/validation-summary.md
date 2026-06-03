# Validation Summary: How to Implement Sidecar Containers for Log Shipping and Aggregation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, Pods, ConfigMaps, Services, volumes, and Downward API
- Fluentd, fluent-plugin-elasticsearch, fluent-plugin-prometheus, S3 and CloudWatch output plugins
- Filebeat 8.11 / Elastic Beats
- Vector and VRL
- mtail
- Prometheus alerting and Prometheus Operator PrometheusRule
- Go structured logging with zap
- Python structured logging with structlog

## Sources Consulted
- Kubernetes documentation: Volumes and `emptyDir`/ConfigMap behavior: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes documentation: Downward API: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Fluentd documentation: tail input: https://docs.fluentd.org/input/tail
- Fluentd documentation: record_transformer filter: https://docs.fluentd.org/filter/record_transformer
- fluent-plugin-elasticsearch README: https://github.com/uken/fluent-plugin-elasticsearch
- fluent-plugin-prometheus README: https://github.com/fluent/fluent-plugin-prometheus
- Elastic Filebeat documentation: filestream input: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Elastic Filebeat documentation: Elasticsearch output: https://www.elastic.co/docs/reference/beats/filebeat/elasticsearch-output
- Elastic Filebeat documentation: change index name: https://www.elastic.co/docs/reference/beats/filebeat/change-index-name
- Elastic Filebeat documentation: add_kubernetes_metadata processor: https://www.elastic.co/guide/en/beats/filebeat/8.19/add-kubernetes-metadata.html
- Vector documentation: environment variable interpolation: https://vector.dev/docs/reference/environment_variables/
- Vector documentation: remap transform / VRL: https://vector.dev/docs/reference/configuration/transforms/remap/
- Vector documentation: Loki sink: https://vector.dev/docs/reference/configuration/sinks/loki/
- mtail programming guide and language reference: https://google.github.io/mtail/Programming-Guide.html and https://google.github.io/mtail/Language.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator documentation: PrometheusRule resources: https://prometheus-operator.dev/docs/developer/alerting/
- structlog documentation: https://structlog.org/en/stable/
- zap package documentation: https://pkg.go.dev/go.uber.org/zap

## Issues Found
- The Fluentd example referenced `ENV['POD_NAMESPACE']` without defining `POD_NAMESPACE` in the container environment. Added a Kubernetes Downward API environment variable for `metadata.namespace`.
- The Filebeat example used the deprecated `log` input with Filebeat 8.11. Changed it to `filestream` and added a stable input `id`, as required by current Filebeat documentation.
- The Filebeat example configured a custom Elasticsearch index without the matching template settings and with ILM still enabled. Added `setup.ilm.enabled: false`, `setup.template.name`, and `setup.template.pattern` so the daily custom index setting is honored.
- The Filebeat example used `add_kubernetes_metadata` with `logs_path: /var/log/app/`, but Elastic documents `logs_path` matching as path-based metadata extraction for Kubernetes/container log paths such as `/var/log/containers/`, `/var/log/pods/`, or mounted kubelet pod paths. Replaced that with explicit pod metadata fields supplied through Downward API environment variables.
- The Vector example referenced `${POD_NAME}` without defining it. Added a Kubernetes Downward API environment variable for `metadata.name`.
- The mtail histogram assigned an integer capture directly to a histogram. mtail histograms observe floats, so the example now uses `float($duration)`.
- The Go zap example referenced `err` without declaring it. Added an `errors` import and a sample error value so the snippet compiles as a standalone example.
- The Fluentd high-buffer alert referenced `fluentd_output_status_buffer_limit_bytes`, which is not an exposed metric in fluent-plugin-prometheus. Replaced the expression with `1 - fluentd_output_status_buffer_available_space_ratio > 0.8`, using an exposed buffer metric.

## Review Notes
Local Ruby and Go formatting/parsing tools were not installed in the review environment, so automated local syntax checks for the extracted snippets could not be run. The examples were reviewed against official documentation. Several Fluentd outputs in the post require non-core plugins such as `fluent-plugin-elasticsearch`, `fluent-plugin-s3`, `fluent-plugin-cloudwatch-logs`, and `fluent-plugin-prometheus`; production images should include those plugins explicitly.
