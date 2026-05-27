# Validation Summary: How to Set Up Config Connector Namespaced Mode for Multi-Tenant GKE Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Config Connector
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Kubernetes RBAC
- Kubernetes ResourceQuota
- Google Cloud IAM
- gcloud CLI
- kubectl

## Sources Consulted
- Google Cloud Config Connector manual installation and namespaced mode documentation: https://docs.cloud.google.com/config-connector/docs/how-to/install-manually
- Google Cloud Config Connector installation type documentation: https://docs.cloud.google.com/config-connector/docs/concepts/installation-types
- Google Cloud Config Connector IAM access control documentation: https://docs.cloud.google.com/config-connector/docs/how-to/configure-iam-permissions
- Google Cloud Config Connector GKE add-on documentation: https://docs.cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Google Cloud Config Connector RBAC access documentation: https://docs.cloud.google.com/config-connector/docs/how-to/securing-access-to-resources
- Google Cloud SDK `gcloud iam service-accounts create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK `gcloud iam service-accounts add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding
- Google Cloud SDK `gcloud projects add-iam-policy-binding` reference: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- GoogleCloudPlatform/k8s-config-connector repository manifests for built-in Config Connector RBAC role names: https://github.com/GoogleCloudPlatform/k8s-config-connector

## Issues Found
- The post stated that Config Connector runs in cluster mode by default. Current GKE add-on documentation says the add-on creates a namespaced-mode ConfigConnector custom resource, while cluster mode is still available as an explicit mode. Changed the wording to describe cluster mode without calling it the default.
- The prerequisites omitted Kubernetes Engine Monitoring, which the Config Connector add-on documentation lists as required. Added it to the prerequisite list.
- The ConfigConnector and ConfigConnectorContext examples omitted `stateIntoSpec: Absent`, which current Config Connector documentation includes in the recommended manifests. Added the field to each relevant manifest.
- The IAM setup omitted the `roles/monitoring.metricWriter` binding on the cluster project that the Config Connector namespaced installation guide includes for publishing metrics to Cloud Monitoring. Added commands for each team service account.
- The ConfigConnectorContext apply command claimed to apply all teams but only referenced `frontend-context.yaml`. Changed the manifest comment and command to use `team-contexts.yaml`.
- The verification example assumed controller pod names like `cnrm-controller-manager-team-frontend-0`. Current documentation verifies namespaced controllers with label selectors because the pod name can include generated text. Replaced the example with `kubectl wait` using the documented labels.
- The RBAC example used `cnrm-manager` as the built-in user-facing ClusterRole. Config Connector manifests expose `cnrm-admin` for managing Config Connector resources. Updated the RoleBinding to reference `cnrm-admin`.

## Review Notes
The tutorial still uses `roles/editor` for brevity, but it correctly tells readers to replace it with narrower roles in production. The bucket name in the StorageBucket example is syntactically valid, but readers must choose a globally unique Cloud Storage bucket name in a real environment.
