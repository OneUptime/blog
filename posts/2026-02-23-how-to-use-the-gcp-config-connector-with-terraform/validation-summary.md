# Validation Summary: How to Use the GCP Config Connector with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Google Cloud Platform
- Google Kubernetes Engine
- Config Connector
- Kubernetes custom resources
- Workload Identity Federation for GKE
- Cloud Monitoring

## Sources Consulted
- Google Cloud Config Connector add-on installation documentation: https://docs.cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Google Cloud Config Connector manual installation documentation: https://docs.cloud.google.com/config-connector/docs/how-to/install-manually
- Google Cloud Config Connector IAM permissions documentation: https://docs.cloud.google.com/config-connector/docs/how-to/configure-iam-permissions
- Google Cloud Config Connector resource concepts documentation: https://docs.cloud.google.com/config-connector/docs/concepts/resources
- Google Cloud Config Connector annotations reference: https://docs.cloud.google.com/config-connector/docs/reference/annotations
- Google Cloud Config Connector StorageBucket reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket
- Google Cloud Config Connector SQLInstance reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqlinstance
- Google Cloud Monitoring filter documentation: https://docs.cloud.google.com/monitoring/api/v3/filters
- Google Cloud GKE system metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_kubernetes
- Terraform Google provider google_container_cluster documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Google provider google_monitoring_alert_policy documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The Config Connector configuration example used `ConfigConnectorContext`, which is for namespaced mode, while the surrounding GKE add-on identity binding was for cluster mode. Changed the Terraform manifest to create the documented cluster-mode `ConfigConnector` resource with `mode`, `googleServiceAccount`, and `stateIntoSpec`.
- The GKE cluster example enabled Workload Identity Federation but did not explicitly enable Kubernetes Engine Monitoring, which the Config Connector add-on requires. Added `monitoring_config` with `SYSTEM_COMPONENTS`.
- The Cloud SQL Config Connector example omitted the project annotation and referenced a network by Config Connector resource name, even though the post's ownership boundary says Terraform manages VPC networks. Added the project annotation and changed the network reference to an external Compute Network self-link format.
- The Cloud Monitoring alert policy filter did not specify a metric type, which is required for metric threshold filters. Replaced it with the documented `kubernetes.io/container/restart_count` metric and added aggregation settings appropriate for a cumulative restart counter.
- The best-practices section said to always set the deletion policy annotation. Adjusted the wording to recommend it for resources that should survive deletion of their Kubernetes resource.

## Review Notes
The examples are intentionally broad and still use `roles/editor` as a simple setup role with a note to scope it down in production. A future improvement would be to show a least-privilege custom role for the specific Config Connector resources used in the examples.
