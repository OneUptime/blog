# Validation Summary: How to Configure Shared VPC for IPv4 Networking in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Shared VPC (XPN)
- gcloud CLI (compute, resource-manager components)
- Compute Engine (VMs, subnets)
- GCP IAM (roles/compute.xpnAdmin, roles/compute.networkUser)
- GCP Organization Policies (constraints/compute.restrictSharedVpcHostProjects)
- IPv4 networking (RFC 1918 subnets)

## Sources Consulted
- gcloud reference: `gcloud compute shared-vpc` — https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc
- gcloud reference: `gcloud compute shared-vpc enable` — https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc/enable
- gcloud reference: `gcloud compute shared-vpc associated-projects` — https://cloud.google.com/sdk/gcloud/reference/compute/shared-vpc/associated-projects
- gcloud reference: `gcloud compute networks subnets add-iam-policy-binding` — https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/add-iam-policy-binding
- gcloud reference: `gcloud compute networks subnets list-usable` — https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/list-usable
- GCP Shared VPC overview — https://cloud.google.com/vpc/docs/shared-vpc
- GCP Shared VPC provisioning guide — https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- GCP Organization Policy constraints — https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- GCP service agents (cloudservices.gserviceaccount.com) — https://cloud.google.com/iam/docs/service-agents

## Issues Found
1. **`gcloud compute shared-vpc enable` does not take an `--organization` flag.** The original command was `gcloud compute shared-vpc enable $HOST_PROJECT --organization=$ORG_ID`. According to the official gcloud reference, this command's only positional argument is the host project ID; it has no `--organization` flag. The organization-level requirement is enforced through the IAM role `roles/compute.xpnAdmin` (which the post already correctly mentions in the section preamble), not via a CLI flag. Fixed by removing the `--organization=$ORG_ID` line so the command is now `gcloud compute shared-vpc enable $HOST_PROJECT`. The `ORG_ID` variable is still used by the subsequent `org-policies set-policy` command, so it is left in place.

## Review Notes
- The `cloudservices.gserviceaccount.com` service account format (`PROJECT_NUMBER@cloudservices.gserviceaccount.com`) used in Step 3 is correct — this is the Google APIs service agent commonly granted `roles/compute.networkUser` on shared subnets so a service project can create VMs that use them.
- The org policy constraint name `constraints/compute.restrictSharedVpcHostProjects` is a valid GCP organization policy constraint.
- `gcloud compute shared-vpc associated-projects add/remove/list` and `gcloud compute shared-vpc get-host-project` are all valid current subcommands.
- `gcloud compute networks subnets list-usable` is a valid command for listing subnets a caller has `compute.subnetworks.use` permission on (useful from a service project).
- The architecture diagram, IPv4 CIDR allocations (10.1.x.0/24), and the overall flow (enable host → attach service projects → grant IAM on subnets → create VMs with `--subnet=<full URI>`) are accurate.
- The `--no-address` flag on `gcloud compute instances create` is a valid flag that omits an external IPv4 address, matching the "Private IP only" comment.
- Note for readers: `gcloud compute shared-vpc` was historically aliased as `gcloud compute xpn`; both still work but the `shared-vpc` form used here is the current preferred form.
