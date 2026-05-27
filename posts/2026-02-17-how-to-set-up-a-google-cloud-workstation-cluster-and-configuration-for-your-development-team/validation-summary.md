# Validation Summary: How to Set Up a Google Cloud Workstation Cluster and Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Cloud Workstations
- Google Cloud CLI (`gcloud`)
- IAM
- Compute Engine VMs
- Persistent disks
- Cloud Workstations custom domains

## Sources Consulted
- Cloud Workstations overview: https://docs.cloud.google.com/workstations/docs/overview
- Create a workstation cluster: https://docs.cloud.google.com/workstations/docs/create-cluster
- Create a workstation configuration: https://docs.cloud.google.com/workstations/docs/create-configuration
- Create and launch a workstation: https://docs.cloud.google.com/workstations/docs/create-workstation
- Access HTTP servers running on a workstation: https://docs.cloud.google.com/workstations/docs/access-http-servers-running-on-workstations
- Access control with IAM: https://docs.cloud.google.com/workstations/docs/access-control
- Cloud Workstations custom domains: https://docs.cloud.google.com/workstations/docs/set-up-custom-domains-for-cloud-workstations
- `gcloud workstations clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/workstations/clusters/create
- `gcloud workstations configs create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/configs/create
- `gcloud workstations create` reference: https://cloud.google.com/sdk/gcloud/reference/workstations/create
- `gcloud workstations set-iam-policy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/set-iam-policy
- Cloud Workstations IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/workstations

## Issues Found
- The post said Cloud Workstations runs on GKE under the hood. Google Cloud documentation states workstation clusters are not related to GKE clusters and that workstations run on ephemeral Compute Engine VMs. Updated the architecture explanation accordingly.
- The cluster creation command included `--domain` as a simple optional custom DNS setting. Current custom-domain documentation requires a private cluster with `--enable-private-endpoint` plus load balancer and DNS setup. Removed `--domain` from the basic cluster command and clarified the custom-domain requirements.
- The post said cluster creation takes 10-15 minutes because it provisions GKE infrastructure. Updated this to "up to 20 minutes" and removed the GKE reference.
- The IAM example used `gcloud workstations add-iam-policy-binding`, which is not present in the current `gcloud workstations` command group. Replaced it with the documented `get-iam-policy` / edit / `set-iam-policy` flow.
- The IAM section omitted `roles/workstations.operationViewer`, which Google documents as required on the project for developers using or creating workstations. Added it to the examples and role explanation.
- The IAM section did not distinguish between using an existing workstation and creating workstations from configurations. Added `roles/workstations.workstationCreator` to cover the post's developer-created workstation workflow.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference documentation rather than local `--help` output.
