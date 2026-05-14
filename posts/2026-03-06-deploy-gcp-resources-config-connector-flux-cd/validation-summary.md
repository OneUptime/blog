# Validation Summary: How to Deploy GCP Resources with Config Connector and Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Config Connector
- Flux CD
- Kubernetes custom resources
- Google Kubernetes Engine
- Google Cloud IAM and Workload Identity Federation for GKE
- Cloud Storage
- Cloud SQL for PostgreSQL
- Compute Engine VPC networking
- Service Networking private services access

## Sources Consulted
- Google Cloud Config Connector overview: https://cloud.google.com/config-connector/docs/overview
- Google Cloud Config Connector GKE add-on installation: https://cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Google Cloud Config Connector manual installation: https://cloud.google.com/config-connector/docs/how-to/install-manually
- Google Cloud Config Connector StorageBucket reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket
- Google Cloud Config Connector SQLInstance, SQLDatabase, and SQLUser references: https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqlinstance, https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqldatabase, https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqluser
- Google Cloud Config Connector ComputeNetwork, ComputeSubnetwork, ComputeFirewall, ComputeAddress references: https://cloud.google.com/config-connector/docs/reference/resource-docs/compute/computenetwork, https://cloud.google.com/config-connector/docs/reference/resource-docs/compute/computesubnetwork, https://cloud.google.com/config-connector/docs/reference/resource-docs/compute/computefirewall, https://cloud.google.com/config-connector/docs/reference/resource-docs/compute/computeaddress
- Google Cloud Config Connector ServiceNetworkingConnection reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/servicenetworking/servicenetworkingconnection
- Google Cloud Config Connector ContainerCluster reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/container/containercluster
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Cloud SQL private services access documentation: https://cloud.google.com/sql/docs/postgres/configure-private-services-access
- GKE release schedule: https://cloud.google.com/kubernetes-engine/docs/release-schedule
- Flux CD source-controller API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux CD kustomize-controller API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CD Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The prerequisites named GKE v1.26 or later, but GKE 1.27 and earlier are no longer supported. Changed this to require a supported GKE cluster.
- The Config Connector installation example used a nonexistent Helm repository and the wrong HelmRelease API version for current Flux. Replaced it with Flux Kustomizations that apply the official Config Connector operator manifest and then the ConfigConnector custom resource after the operator CRDs exist.
- The ConfigConnectorContext example included `requestLimit`, which is not a ConfigConnectorContext field, and used `stateIntoSpec: Merge` despite current guidance recommending `Absent`. Removed `requestLimit` and changed `stateIntoSpec` to `Absent`.
- The Workload Identity binding used the cluster-mode Config Connector Kubernetes service account while the article configured namespaced mode. Updated the member to `cnrm-system/cnrm-controller-manager-default`.
- The StorageBucket CMEK example used `encryption.defaultKmsKeyName`, which is not the Config Connector field. Changed it to `encryption.kmsKeyRef.external`.
- The Cloud SQL private IP example referenced a private VPC network but did not configure private services access. Added Config Connector `ComputeAddress` and `ServiceNetworkingConnection` resources.
- The ComputeFirewall example used `allowed`; the Config Connector field is `allow`. Updated the field name.
- The ContainerCluster example used `spec.removeDefaultNodePool`, which is not a Config Connector spec field. Changed it to the `cnrm.cloud.google.com/remove-default-node-pool: "true"` annotation.
- The Flux Kustomization used `wait: true` with `healthChecks`; Flux ignores explicit `healthChecks` when `wait` is true. Removed the redundant health check block.
- The best-practices section referred to `nameRef` generically and an imprecise abandon policy annotation. Updated the wording to match Config Connector resource references and `cnrm.cloud.google.com/deletion-policy: abandon`.

## Review Notes
The corrected examples are still illustrative and use broad IAM permissions such as `roles/editor`; production setups should replace these with the least-privilege roles required for the resources being managed.
