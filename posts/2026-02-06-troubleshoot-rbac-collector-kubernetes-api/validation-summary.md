# Validation Summary: How to Troubleshoot RBAC Permission Errors When the Collector Cannot Query the

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- Kubernetes RBAC
- Kubernetes ServiceAccounts, ClusterRoles, and ClusterRoleBindings
- OpenTelemetry k8sattributes processor
- OpenTelemetry k8sobjects receiver
- OpenTelemetry kubeletstats receiver
- OpenTelemetry filelog receiver
- OpenTelemetry k8s_observer extension
- kubectl

## Sources Consulted
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry k8sattributesprocessor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry kubeletstatsreceiver README/API documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kubeletstatsreceiver
- OpenTelemetry k8sobserver README/API documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/k8sobserver
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The permissions table said the filelog receiver needs `get`, `list`, and `watch` permissions on pods. The filelog receiver reads log files from the node filesystem and does not query the Kubernetes API by itself. I changed the row to say it needs no Kubernetes API RBAC on its own and that k8sattributes should be used when Kubernetes metadata enrichment is needed.
- The kubeletstats receiver permissions were broader than the receiver's current documented requirement. I changed the default RBAC from `nodes`, `nodes/stats`, and `nodes/proxy` with `get`/`list` to `nodes/stats` with `get`.
- The k8sattributes processor resources were too narrow for the metadata described in the article. I updated the table and ClusterRole to include node metadata and selected workload resources used when extracting workload attributes.
- The k8s_observer extension RBAC listed `services` and `endpoints`, but the current documented observer resources are pods, nodes, services, and ingresses depending on configuration. I updated the ClusterRole resources accordingly.
- The `apps/v1` Deployment example was missing the required `.spec.selector` and matching pod template labels. I added a minimal selector and labels so the snippet is syntactically valid for a Deployment.

## Review Notes
The `kubectl auth can-i` examples use valid syntax, including impersonation with `--as` and `--all-namespaces` for namespaced resources. The Kubernetes RBAC API versions and ServiceAccount binding examples are current. The Collector image tag `latest` is valid but not ideal for reproducible production deployments.
