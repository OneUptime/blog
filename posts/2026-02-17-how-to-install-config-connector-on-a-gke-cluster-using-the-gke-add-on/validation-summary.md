# Validation Summary: How to Install Config Connector on a GKE Cluster Using the GKE Add-On

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Google Kubernetes Engine
- Config Connector
- Workload Identity Federation for GKE
- Kubernetes custom resources
- Google Cloud CLI
- kubectl

## Sources Consulted
- Google Cloud Config Connector documentation: Installing with the GKE add-on: https://docs.cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Google Cloud Config Connector documentation: Access control with IAM: https://docs.cloud.google.com/config-connector/docs/how-to/configure-iam-permissions
- Google Cloud Config Connector documentation: Organizing your resources: https://docs.cloud.google.com/config-connector/docs/how-to/organizing-resources/overview
- Google Cloud Config Connector documentation: Project-scoped resources: https://cloud.google.com/config-connector/docs/how-to/organizing-resources/project-scoped-resources
- Google Cloud Config Connector resource reference: StorageBucket: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket

## Issues Found
- The prerequisites said only "GKE cluster running version 1.15 or later." Updated this to a supported GKE Standard cluster and added the current requirements for Workload Identity Federation for GKE and Kubernetes Engine Monitoring.
- The new cluster creation command omitted the release channel, system logging, and system monitoring options shown in the official add-on installation flow. Added `--release-channel=regular`, `--logging=SYSTEM`, and `--monitoring=SYSTEM`.
- The existing-cluster flow enabled Workload Identity Federation on the cluster but did not mention existing node pools. Added the required `gcloud container node-pools update ... --workload-metadata=GKE_METADATA` step.
- The post used `ConfigConnectorContext` for the add-on cluster-mode configuration. Current official add-on documentation configures a cluster-mode `ConfigConnector` resource with `mode: cluster`, `googleServiceAccount`, and recommended `stateIntoSpec: Absent`; the YAML and apply command were corrected.
- The troubleshooting note referenced `ConfigConnectorContext`; updated it to reference `ConfigConnector` and the expected `cnrm-system/cnrm-controller-manager` Workload Identity binding.
- The cleanup flow disabled the add-on without first deleting the `ConfigConnector` resource. Added the documented `kubectl delete ConfigConnector configconnector.core.cnrm.cloud.google.com --wait=true` step before disabling the add-on.

## Review Notes
The StorageBucket example uses the current `storage.cnrm.cloud.google.com/v1beta1` API and a supported `cnrm.cloud.google.com/project-id` annotation. The post still uses the broad Editor role for simplicity, but it correctly notes that production deployments should use more granular permissions.
