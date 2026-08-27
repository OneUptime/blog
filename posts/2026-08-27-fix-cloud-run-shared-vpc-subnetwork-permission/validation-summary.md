# Validation Summary: How to Fix Cloud Run Shared VPC `Permission Denied on Subnetwork` by Granting the Service Agent

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Google Cloud Run
- Direct VPC egress
- Google Cloud Shared VPC
- Google Cloud IAM roles and service agents
- Google Cloud CLI (`gcloud`)
- VPC subnet addressing, routing, firewall rules, DNS, and Private Google Access

## Sources Consulted

- [Direct VPC egress with a Shared VPC network](https://cloud.google.com/run/docs/configuring/shared-vpc-direct-vpc)
- [Direct VPC with a VPC network](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [Compare Direct VPC egress and Serverless VPC Access connectors](https://cloud.google.com/run/docs/configuring/connecting-vpc)
- [Set up dual-stack IPv4 and IPv6 for Cloud Run](https://cloud.google.com/run/docs/configuring/vpc-dual-stack-subnet)
- [Cloud Run networking best practices](https://cloud.google.com/run/docs/configuring/networking-best-practices)
- [Private networking and Cloud Run](https://cloud.google.com/run/docs/securing/private-networking)
- [Cloud Run roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/run#run.serviceAgent)
- [Google Cloud service agents](https://cloud.google.com/iam/docs/service-agents#google-cloud-run-service-agent)
- [Compute Engine IAM roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/compute)
- [Shared VPC overview and IAM model](https://cloud.google.com/vpc/docs/shared-vpc)
- [View and update Google Cloud projects](https://cloud.google.com/resource-manager/docs/view-update-projects)
- [`gcloud projects add-iam-policy-binding`](https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding)
- [`gcloud projects get-iam-policy`](https://cloud.google.com/sdk/gcloud/reference/projects/get-iam-policy)
- [`gcloud compute networks subnets describe`](https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/describe)
- [`gcloud compute networks subnets add-iam-policy-binding`](https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/add-iam-policy-binding)
- [`gcloud run deploy`](https://cloud.google.com/sdk/gcloud/reference/run/deploy)
- [`gcloud run services describe`](https://cloud.google.com/sdk/gcloud/reference/run/services/describe)
- [`gcloud` filters](https://cloud.google.com/sdk/gcloud/reference/topic/filters)
- [`gcloud` output formats](https://cloud.google.com/sdk/gcloud/reference/topic/formats)

## Issues Found

- The two project-level IAM binding commands did not explicitly select an unconditional binding. When an existing project IAM policy contains conditional bindings, `gcloud` can prompt interactively or fail in non-interactive mode if `--condition` is omitted. Added `--condition=None` to both host-project `add-iam-policy-binding` commands so they reliably create the unconditional grants described by the post.
- The Direct VPC egress IP-allocation link used the nonexistent `#ip-address-allocation` fragment. Updated it to the current `#direct-vpc-ip-allocation` fragment so the link opens the intended section.

## Review Notes

All remaining commands, flags, resource paths, IAM scopes, and networking explanations were verified as current and correct. In particular, the service-project Cloud Run service agent is the required subnet principal; both documented host-project/subnet role layouts are accurate; fully qualified Shared VPC resource names are correct; `private-ranges-only` is supported; and the address-allocation, firewall, and capacity guidance matches current Cloud Run documentation. Shared VPC association and Compute Engine API enablement are reasonable assumed prerequisites for a post diagnosing an existing permission-denied deployment. Command syntax was also checked against the installed Google Cloud SDK 561.0.0. All referenced documentation links resolve after the fragment correction.
