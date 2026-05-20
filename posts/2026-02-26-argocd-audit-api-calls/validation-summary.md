# Validation Summary: How to Audit API Calls in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes audit logging
- kubectl
- jq
- Fluentd
- Elasticsearch
- Grafana Alloy
- Grafana Loki / LogQL
- Argo CD Notifications

## Sources Consulted
- Argo CD command parameters documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD security documentation, API Logs section: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications catalog: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/catalog/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Grafana Loki LogQL log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy Kubernetes log collection documentation: https://grafana.com/docs/grafana-cloud/send-data/alloy/collect/logs-in-kubernetes/
- Grafana Alloy loki.process documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Alloy loki.source.kubernetes documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/

## Issues Found
- The post implied complete API request payload logging. Argo CD documents that payloads for sensitive API requests, such as session creation and cluster creation, are excluded. Updated the wording to clarify that gRPC method metadata is logged while sensitive request payloads are not.
- The sample Argo CD API log included an `ip` field. Argo CD documentation states that it does not log client IP addresses for API endpoints because the API server is typically behind a proxy. Removed the `ip` field from the example.
- The Loki/Promtail section used Promtail, which is end-of-life as of March 2, 2026. Replaced it with a Grafana Alloy/Loki example using Alloy Kubernetes discovery, `loki.source.kubernetes`, and `loki.process`.
- The Promtail JSON extraction used dotted field names as if they were nested object paths. The replacement Alloy config extracts dotted Argo CD log keys with quoted JMESPath expressions.
- The LogQL write-operation query did not explicitly extract the `grpc.method` JSON key. Updated it to extract the dotted JSON key with bracket syntax before filtering.
- The `jq` examples used `.grpc_method` and `.grpc_service`, but the Argo CD JSON fields are `grpc.method` and `grpc.service`. Updated the queries to use `.["grpc.method"]` and `.["grpc.service"]`.
- The Argo CD notification trigger examples directly accessed `app.status.operationState`. Updated them to the current nil-safe expression style shown in Argo CD's documentation.

## Review Notes
- The Kubernetes audit policy snippet is structurally valid for `audit.k8s.io/v1`, but enabling it still requires configuring the Kubernetes API server with audit policy and log/webhook backend flags. Managed Kubernetes providers often expose this differently.
- The Fluentd example is plausible for container log collection, but exact parsing may vary by container runtime log format and Fluentd deployment.
- User labels in Loki can create high cardinality in very large installations; consider using structured metadata or query-time parsing if user cardinality becomes large.
