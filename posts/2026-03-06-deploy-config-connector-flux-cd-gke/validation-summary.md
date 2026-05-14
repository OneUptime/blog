# Validation Summary: How to Deploy Config Connector with Flux CD on GKE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Config Connector
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Flux CD Kustomizations
- Kubernetes manifests and Kustomize
- Cloud Storage
- Cloud SQL for PostgreSQL
- Pub/Sub
- Google Cloud IAM

## Sources Consulted
- Google Cloud Config Connector: Installing with the GKE add-on: https://docs.cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall
- Google Cloud Config Connector: Install in namespaced mode: https://cloud.google.com/config-connector/docs/how-to/install-namespaced
- Google Cloud Config Connector: Organizing resources: https://docs.cloud.google.com/config-connector/docs/how-to/organizing-resources/overview
- Google Cloud Config Connector StorageBucket reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket
- Google Cloud Config Connector SQLInstance reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqlinstance
- Google Cloud Config Connector SQLDatabase reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqldatabase
- Google Cloud Config Connector PubSubTopic reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubtopic
- Google Cloud Config Connector PubSubSubscription reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubsubscription
- Google Cloud Config Connector IAMPolicyMember reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/iam/iampolicymember
- Google Cloud Config Connector annotations reference: https://cloud.google.com/config-connector/docs/reference/annotations
- Flux Kustomization reference: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post used a `ConfigConnectorContext` but did not configure Config Connector for namespaced mode. Added the required `ConfigConnector` manifest with `mode: namespaced` and `stateIntoSpec: Absent`.
- The Workload Identity binding used the cluster-mode Kubernetes service account name. Updated it to `cnrm-controller-manager-config-connector`, which is the namespaced-mode service account created for the `config-connector` namespace.
- The prerequisites did not mention that Workload Identity Federation for GKE must already be enabled for the cluster and node pools before enabling the add-on on an existing cluster. Added that prerequisite.
- The required API list omitted `compute.googleapis.com` and `servicenetworking.googleapis.com`, which are needed for the network/private Cloud SQL example path shown later in the post. Added both APIs.
- The `ConfigConnectorContext` description incorrectly implied that `googleServiceAccount` selects the project. Updated the wording to clarify that the namespace annotation selects the project and the context selects the service account.
- The Flux Kustomization set both `wait: true` and `healthChecks`. Flux ignores `healthChecks` when `wait: true` is set, so removed `wait: true` from that setup Kustomization.
- The Storage bucket lifecycle rule used `isLive: false`, which is not a Config Connector `StorageBucket` lifecycle condition field. Replaced it with `withState: ARCHIVED`.
- The Pub/Sub subscription referenced a dead-letter topic that was not defined. Added a `PubSubTopic` manifest for `app-events-dlq`.

## Review Notes
- `roles/editor` is technically valid for a tutorial, but the post already notes that production deployments should use narrower roles. For IAM resources and project-level changes, `roles/owner` or more specific administrative roles may be required.
- `gcloud` was not installed in the local workspace, so CLI validation was performed against official Google Cloud documentation instead of local `--help` output.
