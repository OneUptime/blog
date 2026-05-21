# Validation Summary: How to Send Istio Access Logs to Elasticsearch

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio Telemetry API and MeshConfig extension providers
- Envoy access logs
- Fluent Bit Kubernetes logging pipeline
- Kubernetes DaemonSet and RBAC
- Elasticsearch index templates and ILM
- OpenTelemetry Collector
- Kibana queries and dashboards

## Sources Consulted
- Istio Envoy access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy access log formatting documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Fluent Bit 3.0 Kubernetes filter documentation: https://docs.fluentbit.io/manual/3.0/pipeline/filters/kubernetes
- Fluent Bit 3.0 Grep filter documentation: https://docs.fluentbit.io/manual/3.0/pipeline/filters/grep
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/3.2/pipeline/outputs/elasticsearch/
- Elasticsearch ILM shrink action documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-shrink
- Elasticsearch ILM rollover documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- OpenTelemetry Collector Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md

## Issues Found
- The Fluent Bit grep filter originally ran after the Kubernetes filter removed the `log` field with `Keep_Log Off`, so it would not reliably filter JSON access-log lines. I moved the grep filter before the Kubernetes filter.
- The Fluent Bit Kubernetes filter used a custom `istio.*` tag without setting a matching `Kube_Tag_Prefix`, which prevents the filter from extracting pod metadata from tailed container log filenames. I added `Kube_Tag_Prefix istio.var.log.containers.`.
- The DaemonSet referenced `serviceAccountName: fluent-bit` but the post did not define the service account or RBAC needed by the Kubernetes metadata filter. I added a minimal namespace, ServiceAccount, ClusterRole, and ClusterRoleBinding snippet.
- The Elasticsearch template and ILM examples mixed Fluent Bit daily Logstash-format indices with an ILM rollover alias. Since `Logstash_Format On` creates daily indices from `Logstash_Prefix`, I removed the rollover alias and rollover action and updated the explanation to match daily index creation.
- The OpenTelemetry Collector Elasticsearch exporter snippet used `mapping.mode: ecs`, which current exporter documentation marks as deprecated and ignored. I changed it to set `elastic.mapping.mode` with the transform processor.

## Review Notes
- The examples still assume the Elasticsearch service is reachable without authentication and that TLS settings match the cluster endpoint. Production deployments usually need credentials, CA configuration, and longer retry settings.
- The OTel Elasticsearch exporter ECS mapping mode is documented as unstable and requires compatible Elasticsearch versions; the post now uses the current configuration mechanism but readers should verify exporter and Elasticsearch versions together.
