# Validation Summary: How to Deploy Config Connector with Flux on GKE

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Config Connector
- Workload Identity Federation for GKE
- Flux Kustomizations
- Kustomize
- Kubernetes manifests and custom resources
- Google Cloud IAM, Cloud Storage, Pub/Sub, and Cloud SQL

## Sources Consulted
- Google Cloud Config Connector: Installing with the GKE add-on - https://cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Google Cloud Config Connector: Install Config Connector manually / namespaced mode - https://cloud.google.com/config-connector/docs/how-to/install-manually
- Google Cloud Config Connector: Choosing an installation type - https://cloud.google.com/config-connector/docs/concepts/installation-types
- Google Cloud Config Connector: Organizing your resources - https://cloud.google.com/config-connector/docs/how-to/organizing-resources/overview
- Google Cloud Config Connector: Creating resource references - https://cloud.google.com/config-connector/docs/how-to/creating-resource-references
- Google Cloud Config Connector resource reference: StorageBucket - https://cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket
- Google Cloud Config Connector resource reference: PubSubTopic - https://cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubtopic
- Google Cloud Config Connector resource reference: PubSubSubscription - https://cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubsubscription
- Google Cloud Config Connector resource reference: SQLInstance - https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqlinstance
- Google Cloud Config Connector resource reference: SQLDatabase - https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqldatabase
- Google Cloud Config Connector resource reference: IAMServiceAccount - https://cloud.google.com/config-connector/docs/reference/resource-docs/iam/iamserviceaccount
- Google Cloud Config Connector annotations reference - https://cloud.google.com/config-connector/docs/reference/annotations
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post described using the GKE Config Connector add-on with a `ConfigConnectorContext`, but the Workload Identity binding used the cluster-mode Kubernetes service account `cnrm-controller-manager`. I changed it to `cnrm-controller-manager-default`, which matches Config Connector namespaced mode for the `default` namespace.
- The post implied that `ConfigConnectorContext` selects the managed GCP project. I clarified that it configures authentication, and that project scope is supplied through Config Connector scope annotations.
- Several resource examples lacked `cnrm.cloud.google.com/project-id` annotations, so they would depend on an unstated namespace annotation. I added explicit project annotations to the Pub/Sub, Cloud SQL, IAM service account, and SQL database examples.
- The post said Autopilot clusters enable Config Connector differently. I corrected this to state that the GKE Config Connector add-on is only available on GKE Standard, and that Autopilot users should use manual installation or Config Controller.
- The Cloud SQL example referenced a private network without defining the required networking resources. I removed the `privateNetworkRef` block so the example remains a focused, valid Cloud SQL instance snippet.
- Added the recommended `stateIntoSpec: Absent` field to the `ConfigConnectorContext` example.

## Review Notes
The examples still use placeholder project, cluster, and resource names. In a real deployment, globally unique resources such as Cloud Storage bucket names must be replaced with available names, and production IAM should use granular roles instead of `roles/editor`.
