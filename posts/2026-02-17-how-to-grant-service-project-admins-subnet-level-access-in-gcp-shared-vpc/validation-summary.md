# Validation Summary: How to Grant Service Project Admins Subnet-Level Access in GCP Shared VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Shared VPC
- Google Cloud IAM
- Compute Engine subnet IAM policies
- Google Kubernetes Engine (GKE)
- Internal load balancing on Shared VPC
- Terraform Google provider
- Google Cloud CLI

## Sources Consulted
- Google Cloud Shared VPC overview: https://cloud.google.com/vpc/docs/shared-vpc
- Google Cloud Shared VPC provisioning guide: https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- Google Cloud GKE Shared VPC guide: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-shared-vpc
- Google Cloud IAM Conditions resource attributes: https://cloud.google.com/iam/docs/conditions-resource-attributes
- Google Cloud IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud Compute Engine roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/compute
- Google Cloud internal Application Load Balancer with Shared VPC guide: https://cloud.google.com/load-balancing/docs/l7-internal/l7-internal-shared-vpc
- Google Cloud SDK reference for Compute Engine subnetwork IAM commands: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/get-iam-policy
- Terraform Google provider `google_compute_subnetwork_iam_binding`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork_iam

## Issues Found
- The original IAM Conditions examples showed project-level `roles/compute.networkUser` bindings filtered by subnetwork name or region. Current IAM resource attribute documentation does not list Compute Engine subnetworks as a supported resource type for `resource.name` conditions, while Shared VPC documentation recommends granting `compute.networkUser` directly on selected subnets. Replaced that section with guidance to use subnet IAM bindings and, when needed, the `constraints/compute.restrictSharedVpcSubnetworks` organization policy constraint.
- The GKE service account example granted `roles/container.hostServiceAgentUser` to the GKE service agent but only granted subnet-level `roles/compute.networkUser` to the Google APIs service agent. GKE Shared VPC documentation says the GKE service agent also needs `Compute Network User` on the specific subnet or whole host project. Added the missing subnet-level binding for `service-PROJECT_NUMBER@container-engine-robot.iam.gserviceaccount.com`.
- The Terraform examples included the Google APIs service agent but omitted the GKE service agent from subnet-level `roles/compute.networkUser` members. Added the GKE service agent entries.
- The common mistakes section referred to `iam-policy-binding set`, which is not the command name. Corrected it to `set-iam-policy` versus `add-iam-policy-binding`.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command syntax was verified against official Google Cloud SDK documentation and Google Cloud product documentation rather than local `gcloud --help` output.
