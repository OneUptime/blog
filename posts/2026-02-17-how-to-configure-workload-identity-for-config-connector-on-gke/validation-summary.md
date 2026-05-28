# Validation Summary: How to Configure Workload Identity for Config Connector on GKE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- Config Connector
- Workload Identity Federation for GKE
- Google Cloud IAM
- Kubernetes service accounts
- Google Cloud CLI
- Kubernetes manifests

## Sources Consulted
- Google Cloud Config Connector: Install Config Connector manually: https://docs.cloud.google.com/config-connector/docs/how-to/install-manually
- Google Cloud Config Connector: Installing with the GKE add-on: https://cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Google Cloud Config Connector: Choosing an installation type: https://cloud.google.com/config-connector/docs/concepts/installation-types
- Google Kubernetes Engine: Workload Identity Federation for GKE concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Kubernetes Engine: Authenticate to Google Cloud APIs from GKE workloads: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud Config Connector StorageBucket reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket

## Issues Found
- The cluster-mode configuration incorrectly used `ConfigConnectorContext`. Current Config Connector documentation uses the cluster-scoped `ConfigConnector` custom resource with `spec.mode: cluster` and `spec.googleServiceAccount` for cluster mode. Updated the YAML and `kubectl apply` filename accordingly.
- The namespaced-mode section skipped the required `ConfigConnector` custom resource with `spec.mode: namespaced`. Added the minimal documented configuration before the per-namespace service account and `ConfigConnectorContext` steps.
- The new GKE cluster command enabled the Config Connector add-on but omitted the documented system logging and monitoring flags used by the add-on installation guide. Added `--logging=SYSTEM` and `--monitoring=SYSTEM`.

## Review Notes
The general Workload Identity binding format, Config Connector controller service account names, `roles/iam.workloadIdentityUser` usage, node pool metadata server flag, and `StorageBucket` manifest shape were consistent with current Google Cloud documentation. The local environment did not have `gcloud` installed, so CLI flags were verified against official Google Cloud documentation rather than local `--help` output.
