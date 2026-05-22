# Validation Summary: How to Audit Per-Tenant Traffic in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio access logging and Telemetry API
- Istio RequestAuthentication and JWT claim forwarding
- Istio EnvoyFilter
- Envoy access log format operators
- Fluent Bit Kubernetes log collection
- Elasticsearch queries and Index Lifecycle Management
- Prometheus queries for Istio metrics

## Sources Consulted
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio security troubleshooting and RBAC debug logging: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy substitution formatter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Fluent Bit Kubernetes logging documentation: https://docs.fluentbit.io/manual/2.2/installation/kubernetes
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Elasticsearch removal of mapping types: https://www.elastic.co/docs/manage-data/data-store/mapping/removal-of-mapping-types
- Elasticsearch ILM phases and actions: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-index-lifecycle.html/
- Elasticsearch 8.0 migration notes for ILM freeze action: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/migrating-8.0.html

## Issues Found
- The custom access log example used `source_namespace: "%REQ(X-FORWARDED-CLIENT-CERT)%"`, which does not directly represent a namespace. Changed it to `source_principal: "%DOWNSTREAM_PEER_URI_SAN%"`, which matches Envoy's supported peer certificate URI SAN formatter and is closer to Istio workload identity.
- The examples used `%REQ(PATH)%` for request paths. Changed these to `%PATH%`, Envoy's path formatter, to avoid relying on a non-canonical header name.
- The JWT section forwarded the entire JWT payload with `outputPayloadToHeader`, which Istio documents as base64-encoded and difficult to query directly. Changed the example to `outputClaimToHeaders` for `sub` and `email`, and updated the log format and explanation accordingly.
- The Fluent Bit Elasticsearch output used `Type _doc`. Elasticsearch 8 no longer supports mapping types, so the output now uses `Suppress_Type_Name On`.
- The Prometheus query description claimed it grouped by path, but the query only grouped by destination namespace, response code, and destination workload. Updated the wording to match the actual query and Istio's default metric labels.
- The Elasticsearch ILM policy used the `freeze` action in the cold phase. In Elasticsearch 8, the ILM freeze action is a no-op and should be removed. Replaced it with `readonly`.

## Review Notes
- `outputClaimToHeaders` is documented by Istio but marked experimental, so production users should verify support in their deployed Istio version.
- The Fluent Bit example still uses the Docker parser, which is valid for Docker-format container logs. Clusters using CRI/containerd should switch the input parser to `cri`.
