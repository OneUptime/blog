# Validation Summary: Set Up GKE Fleet Management to Manage Multiple Clusters from a Central Hub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- GKE Fleet Management
- Config Sync
- Policy Controller
- Multi-Cluster Services
- Kubernetes Gatekeeper constraints
- Terraform Google provider
- Google Cloud CLI

## Sources Consulted
- Google Cloud: Register a cluster on Google Cloud to your fleet: https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs/register/gke
- Google Cloud: Create fleets to simplify multi-cluster management: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/creating-fleets
- Google Cloud: Config Sync gcloud apply spec fields: https://docs.cloud.google.com/kubernetes-engine/config-sync/docs/reference/gcloud-apply-fields
- Google Cloud: Install Policy Controller: https://docs.cloud.google.com/kubernetes-engine/policy-controller/docs/how-to/installing-policy-controller
- Google Cloud: Policy Controller constraint template library: https://cloud.google.com/kubernetes-engine/policy-controller/docs/latest/reference/constraint-template-library
- Google Cloud: Configuring multi-cluster Services: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-services
- Google Cloud SDK: gcloud container fleet memberships bindings create: https://cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/bindings/create
- Google Cloud SDK: gcloud container fleet scopes namespaces create: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/scopes/namespaces/create
- Terraform Registry: google_gke_hub_membership: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/gke_hub_membership
- Terraform Registry: google_gke_hub_feature: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/gke_hub_feature

## Issues Found
- The post said every Google Cloud project has one fleet by default. Updated this to say a project can have at most one fleet, and that the fleet is created when you register a cluster or create an empty fleet.
- The same-project GKE registration examples used `--fleet-project`, which is for cross-project registration. Updated the commands to use `--enable-fleet` with `--project=my-project`.
- The Config Sync example used a Kubernetes `ConfigManagement` object with nested `git` fields as the `gcloud beta container fleet config-management apply --config` file. Updated it to the current apply-spec format with `applySpecVersion: 1` and the supported `spec.configSync` fields.
- The text implied one Config Sync apply command configured all fleet clusters. Updated it to clarify that the command applies settings to each selected fleet member.
- The Policy Controller example used the older Config Management apply path and a `ConfigManagement` manifest. Updated it to use `gcloud container fleet policycontroller enable --memberships=...`.
- The membership describe example used the cluster zone as the membership location. Updated it to the regional membership location used by current GKE registration defaults.
- The Multi-Cluster Services IAM binding used the older Kubernetes service account member syntax. Updated it to the current Workload Identity principal URI format for the MCS importer.

## Review Notes
Local `gcloud --help` verification could not be performed because `gcloud` is not installed in this workspace, so CLI validation was performed against the official Google Cloud SDK and GKE documentation. The examples still use placeholder project IDs and a placeholder project number; readers must replace those values with their fleet host project ID and project number.
