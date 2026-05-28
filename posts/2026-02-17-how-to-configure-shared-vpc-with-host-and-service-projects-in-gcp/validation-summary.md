# Validation Summary: How to Configure Shared VPC with Host and Service Projects in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Shared VPC
- Google Cloud VPC networking
- Compute Engine
- GKE
- Google Cloud IAM
- gcloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Shared VPC overview: https://cloud.google.com/vpc/docs/shared-vpc
- Google Cloud Provision Shared VPC guide: https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- Google Cloud GKE Shared VPC guide: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-shared-vpc
- gcloud shared-vpc associated-projects reference: https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc/associated-projects
- gcloud shared-vpc associated-projects list reference: https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc/associated-projects/list
- gcloud compute networks subnets reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets
- gcloud compute networks subnets create reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- gcloud compute networks create reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/create
- gcloud compute firewall-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Terraform google_compute_shared_vpc_service_project resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_service_project

## Issues Found
- The subnet-level Network User example used `gcloud projects add-iam-policy-binding` with an IAM condition. That grants a project-level binding and is not the documented subnet-level Shared VPC pattern. Changed it to `gcloud compute networks subnets add-iam-policy-binding` with `--project`, `--region`, `--member`, and `--role`.
- The GKE Shared VPC section only granted `roles/container.hostServiceAgentUser` to the service project's GKE service agent. Google Cloud documentation also requires the service project's GKE service agent to have `roles/compute.networkUser` on the host project or the specific subnet. Added the subnet-level Compute Network User binding before the Host Service Agent User binding.
- The subnet usage section said the `subnets describe` command checks how many IPs are in use, but it only displays configured primary and secondary CIDR ranges. Updated the comment to match the command's actual output.
- The instance listing example claimed to list all instances using the subnet across all projects, but `gcloud compute instances list` operates within a selected project. Updated the comment and command to scope it to `service-project-a`.

## Review Notes
The remaining Shared VPC setup, service project attachment, firewall rule, VM creation, GKE cluster creation, and Terraform examples match current official documentation patterns. For production use, teams should also review organization policies such as `constraints/compute.restrictSharedVpcSubnetworks` and confirm service-specific requirements for Cloud Run or load balancers.
