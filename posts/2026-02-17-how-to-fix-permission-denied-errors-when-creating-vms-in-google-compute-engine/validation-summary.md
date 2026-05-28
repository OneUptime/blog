# Validation Summary: How to Fix Permission Denied Errors When Creating VMs in Google Compute Engine

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Platform
- Compute Engine
- IAM
- Service accounts
- Organization Policy
- Shared VPC
- Google Cloud CLI
- Policy Troubleshooter

## Sources Consulted
- Google Cloud Compute Engine IAM roles and permissions: https://docs.cloud.google.com/compute/docs/access/iam
- Google Cloud Compute Engine service accounts: https://docs.cloud.google.com/compute/docs/access/service-accounts
- Google Cloud guide to creating VMs with user-managed service accounts: https://cloud.google.com/compute/docs/access/create-enable-service-accounts-for-instances
- Google Cloud organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- gcloud resource-manager org-policies list reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/list
- gcloud resource-manager org-policies describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/describe
- gcloud compute instances create reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud Shared VPC overview and provisioning docs: https://cloud.google.com/vpc/docs/shared-vpc and https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- gcloud compute networks subnets add-iam-policy-binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/add-iam-policy-binding
- gcloud services list reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/list
- gcloud policy-intelligence troubleshoot-policy iam reference: https://docs.cloud.google.com/sdk/gcloud/reference/policy-intelligence/troubleshoot-policy/iam
- Google Cloud Policy Troubleshooter documentation: https://docs.cloud.google.com/policy-intelligence/docs/troubleshoot-access
- Google Cloud VPC Service Controls violation analyzer documentation: https://docs.cloud.google.com/vpc-service-controls/docs/troubleshooter

## Issues Found
- The organization policy listing comment said the command listed all constraints on the project. The documented command lists organization policies associated with the resource unless `--show-unset` is used, so the wording was changed to "organization policies set on the project."
- The specific organization policy check did not use `--effective`, which can miss inherited organization or folder policies. Added `--effective` so the command matches the surrounding explanation about policies that apply to the project.
- The Shared VPC remediation used a project-level IAM binding with a resource-name condition for one subnet. Google Cloud documents granting `roles/compute.networkUser` on the host project or directly on selected subnetworks. Replaced the command with `gcloud compute networks subnets add-iam-policy-binding` for the target subnet.
- The quick permission check script used `gcloud asset check-iam-policy`, which is not a current documented Cloud Asset Inventory command. Replaced it with the documented `gcloud policy-intelligence troubleshoot-policy iam` command.
- The Policy Troubleshooter section claimed it checks IAM policies, organization policies, and VPC Service Controls all at once. Official documentation says Policy Troubleshooter evaluates IAM allow policies, deny policies, and principal access boundary policies, and does not diagnose VPC Service Controls issues. Updated the text to direct readers to dedicated organization policy views and the VPC Service Controls violation analyzer for those cases.

## Review Notes
The post is technically relevant and the main IAM role guidance is consistent with Google Cloud documentation. A future improvement would be to recommend granting `roles/iam.serviceAccountUser` on the specific service account rather than at the whole project level when possible, but the project-level command shown is valid.
