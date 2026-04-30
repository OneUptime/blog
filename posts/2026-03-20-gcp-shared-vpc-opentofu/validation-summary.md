# Validation Summary: How to Create GCP Shared VPC with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Shared VPC
- Google Compute Engine
- Google Kubernetes Engine (GKE) Shared VPC IAM considerations
- OpenTofu / Terraform HCL
- HashiCorp Google provider resources for networking and IAM

## Sources Consulted
- Google Cloud: Shared VPC overview — https://cloud.google.com/vpc/docs/shared-vpc
- Google Cloud: Provision Shared VPC — https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- Google Cloud: Configure clusters with Shared VPC — https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-shared-vpc
- Terraform Registry: `google_compute_shared_vpc_host_project` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_host_project
- Terraform Registry: `google_compute_shared_vpc_service_project` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_service_project
- Terraform Registry: `google_compute_subnetwork_iam_member` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork_iam
- Terraform Registry: `google_compute_subnetwork` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Registry: `google_compute_instance` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The original subnet IAM example labeled `SERVICE_PROJECT_NUMBER@cloudservices.gserviceaccount.com` as a compute service account, but that principal is the Google APIs service account and did not match the Step 5 VM example. I changed the example to grant `roles/compute.networkUser` to the actual IAM principal that creates resources in the service project via `var.service_project_1_admin_member`.
- The VM example did not depend on the service-project attachment or subnet IAM binding, so a single `apply` could attempt VM creation before Shared VPC access was usable. I added explicit `depends_on` entries for the service-project attachment and subnet IAM membership.
- The GKE subnet IAM example could be read as sufficient by itself. I added a note that GKE Shared VPC setups can also require `roles/container.hostServiceAgentUser` on the host project when GKE access was not enabled during project attachment.

## Review Notes
- The Shared VPC host-project and service-project resources are current and valid in the Google provider.
- The `google_compute_instance` example correctly uses `subnetwork_project` for a subnet that lives in the host project; when `subnetwork` is a self link this field is redundant but still valid.
- The boot disk image reference `debian-cloud/debian-12` is a valid image-family style reference for the Google provider.
- The post includes GKE-oriented secondary ranges and IAM examples, but it does not configure a GKE cluster. A future revision could add a dedicated GKE example if that becomes a goal.
