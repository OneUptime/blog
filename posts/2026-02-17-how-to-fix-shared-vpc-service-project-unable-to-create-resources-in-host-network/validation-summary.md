# Validation Summary: How to Fix Shared VPC Service Project Unable to Create Resources in Host Network

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud Shared VPC
- Google Cloud VPC subnet IAM
- Compute Engine
- Google Kubernetes Engine
- Internal load balancing
- Google Cloud organization policies
- gcloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Shared VPC overview: https://cloud.google.com/vpc/docs/shared-vpc
- Google Cloud Provision Shared VPC guide: https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- gcloud `compute shared-vpc associated-projects list` reference: https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc/associated-projects/list
- gcloud `compute shared-vpc associated-projects add` reference: https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc/associated-projects/add
- gcloud `compute networks subnets list-usable` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/list-usable
- gcloud `compute networks subnets describe` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/describe
- gcloud `resource-manager org-policies describe` reference: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/describe
- Google Cloud organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- GKE Shared VPC guide: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-shared-vpc
- Terraform Google provider subnetwork IAM resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork_iam

## Issues Found
- The Shared VPC associated projects list command used `--project=host-project-id` instead of passing the host project as the command's required positional argument. Updated the command to `gcloud compute shared-vpc associated-projects list host-project-id`.
- The post implied the Google APIs service account is always the correct principal for Compute Engine VMs and internal load balancers. Updated the wording to distinguish direct user/automation-created resources from managed instance groups, where the Google APIs service account is specifically required.
- The `subnets list-usable` example used the service project as `--project`. For Shared VPC, the command should list usable subnets in the host project and can include `--service-project` to evaluate use by the service project. Updated the command accordingly.
- The IP utilization command did not request utilization data; it only displayed CIDR configuration. Added `--view=WITH_UTILIZATION` and changed the JSON fields to include `utilizationDetails`.

## Review Notes
The local environment did not have `gcloud` installed, so CLI checks were performed against the official Google Cloud SDK reference documentation rather than local `--help` output.
