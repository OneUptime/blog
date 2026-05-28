# Validation Summary: How to Fix GKE Config Connector Resource Reconciliation Stuck in Updating State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes
- Config Connector
- Google Cloud IAM
- Google Cloud CLI
- Google Cloud Service Usage API
- Prometheus metrics

## Sources Consulted
- Config Connector overview: https://docs.cloud.google.com/config-connector/docs/overview
- Config Connector resources and status conditions: https://cloud.google.com/config-connector/docs/concepts/resources
- Monitoring Config Connector resources: https://docs.cloud.google.com/config-connector/docs/how-to/monitoring-your-resources
- Troubleshoot Config Connector: https://cloud.google.com/config-connector/docs/troubleshooting
- Install Config Connector manually / namespaced mode: https://docs.cloud.google.com/config-connector/docs/how-to/install-manually
- Access control with IAM for Config Connector: https://docs.cloud.google.com/config-connector/docs/how-to/configure-iam-permissions
- Managing and deleting Config Connector resources: https://docs.cloud.google.com/config-connector/docs/how-to/managing-deleting-resources
- Managing conflicts with multiple Config Connector resources: https://docs.cloud.google.com/config-connector/docs/concepts/managing-conflicts
- Ignore unspecified fields / state-into-spec behavior: https://docs.cloud.google.com/config-connector/docs/concepts/ignore-unspecified-fields
- Monitoring Config Connector with Prometheus: https://docs.cloud.google.com/config-connector/docs/how-to/monitoring-prometheus
- gcloud projects add-iam-policy-binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- gcloud services enable reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable

## Issues Found
- The namespace-scoped service account check mixed project selection with identity lookup. I changed the text to describe the namespace annotation as the target project annotation and added a direct `ConfigConnectorContext` `spec.googleServiceAccount` lookup.
- The cluster-mode identity check used a broad YAML dump. I changed it to query `ConfigConnector` `spec.googleServiceAccount` directly.
- The resource adoption guidance incorrectly recommended `cnrm.cloud.google.com/state-into-spec: merge`. Current Config Connector documentation says acquisition is based on matching name or `spec.resourceID`, and `merge` is unsupported for CRDs added in version 1.114.0 and later. I replaced that guidance with name/resourceID matching and conflict-prevention guidance.
- The adoption YAML described `management-conflict-prevention-policy` but did not include it. I added the annotation to the example.
- The controller log command omitted the documented `manager` container. I added `-c manager`.
- The webhook log command omitted the webhook container. I added `-c webhook`.
- The controller restart command targeted only a single StatefulSet name. I changed it to restart controller-manager StatefulSets by label in `cnrm-system`, which better covers cluster and namespaced controller deployments.
- The metrics command used `kubectl get --raw /metrics`, which reads Kubernetes API server metrics rather than the Config Connector Prometheus endpoint. I changed it to port-forward `cnrm-controller-manager-service` on port 8888 and query `configconnector_reconcile` metrics.
- The final `kubectl get gcp` custom columns used an invalid JSONPath filter shape. I changed it to quote the custom-columns argument and use `?(@.type=="Ready")`.

## Review Notes
The remaining commands and snippets are broadly accurate for current Config Connector and Google Cloud CLI usage. The exact IAM roles needed still vary by managed resource and organization policy, so the role examples should be treated as starting points rather than a complete least-privilege matrix.
