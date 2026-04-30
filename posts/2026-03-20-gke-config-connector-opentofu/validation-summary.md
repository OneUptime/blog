# Validation Summary: How to Set Up GKE Config Connector with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Config Connector
- OpenTofu / Terraform-compatible HCL
- Google Cloud IAM
- Kubernetes
- Cloud SQL for PostgreSQL

## Sources Consulted
- Config Connector with the GKE add-on: https://cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Config Connector manual install and namespaced mode: https://cloud.google.com/config-connector/docs/how-to/install-namespaced
- Config Connector IAM guidance: https://cloud.google.com/config-connector/docs/how-to/configure-iam-permissions
- Config Connector resource organization: https://cloud.google.com/config-connector/docs/how-to/organizing-resources/overview
- Project-scoped resource configuration: https://cloud.google.com/config-connector/docs/how-to/organizing-resources/project-scoped-resources
- SQLInstance resource reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqlinstance
- Google provider `google_container_cluster` reference: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_cluster.html.markdown

## Issues Found
- The cluster example removed the default node pool without creating a replacement. I removed `remove_default_node_pool = true` so the example leaves a schedulable node pool for Config Connector to run on.
- The post mixed a namespaced `ConfigConnectorContext` with a cluster-mode Workload Identity binding to `cnrm-system/cnrm-controller-manager`. I changed the binding to the namespace-scoped controller service account `cnrm-controller-manager-app-namespace`, which matches namespaced mode.
- The namespaced setup omitted the Monitoring metric writer role required by the namespaced controller. I added `roles/monitoring.metricWriter` for the Config Connector service account.
- The namespace used by `ConfigConnectorContext` and `SQLInstance` was never created. I added a `kubernetes_namespace_v1` resource and annotated it with `cnrm.cloud.google.com/project-id`.
- The `ConfigConnectorContext` example used `requestProjectPolicy` instead of the baseline configuration shown in the install docs. I replaced it with the documented `stateIntoSpec = "Absent"` setting and kept the service account binding.
- The Cloud SQL example comment said it created a database, but the `SQLInstance` CRD creates a Cloud SQL instance. I corrected the comment.
- The SQL instance and context manifests had no ordering relationship. I added `depends_on` so the namespace, IAM bindings, and `ConfigConnectorContext` are created before dependent resources.

## Review Notes
- The revised example assumes the cluster project, host project, and managed project are all the same `var.project_id`. If those differ, the IAM bindings and namespace annotation need to use the appropriate project IDs.
- Google documents that the GKE add-on can lag the latest Config Connector release. If you need the newest Config Connector version on a specific schedule, manual installation or Config Controller may be a better fit.
