# Validation Summary: How to Implement ITAR Compliance for Defense Workloads on Google Cloud

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Assured Workloads
- ITAR control package
- Google Cloud CLI
- Cloud KMS and Cloud HSM
- Google Cloud Organization Policy
- Compute Engine networking and Cloud NAT
- VPC Service Controls
- IAM custom roles
- Cloud Logging sinks and Cloud Storage retention
- Security Command Center notifications
- Terraform Google provider

## Sources Consulted
- Google Cloud Assured Workloads ITAR control package: https://cloud.google.com/assured-workloads/docs/control-packages/itar
- Google Cloud CLI reference for `gcloud assured workloads create`: https://cloud.google.com/sdk/gcloud/reference/assured/workloads/create
- Google Cloud Organization Policy constraints reference: https://cloud.google.com/organization-policy/reference/org-policy-constraints
- Google Cloud Compute Engine external IP organization policy guidance: https://cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address
- Google Cloud KMS Cloud HSM documentation: https://cloud.google.com/kms/docs/hsm
- Google Cloud CLI reference for VPC Service Controls perimeters: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- Google Cloud CLI reference for Cloud Logging sinks: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud CLI reference for Security Command Center notifications: https://cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Google Cloud IAM roles and permissions documentation for GKE and Cloud Logging: https://cloud.google.com/iam/docs/roles-permissions/container and https://cloud.google.com/iam/docs/roles-permissions/logging

## Issues Found
- The post incorrectly described IL4 as the Assured Workloads regime that covers ITAR. Updated the text, CLI example, and Terraform snippet to use the ITAR control package instead.
- The `gcloud assured workloads create` command used an unqualified billing account ID and an outdated uppercase compliance-regime value for the CLI. Updated the billing account format to `billingAccounts/...` and the CLI value to `itar`.
- The ITAR access description narrowed "US persons" to citizens and permanent residents. Updated the wording to refer to US persons as defined by ITAR.
- The CMEK organization policy example omitted the required `is:` prefix for `constraints/gcp.restrictNonCmekServices` values. Added the prefix to each service.
- The external IP organization policy example treated `compute.vmExternalIpAccess` as a boolean constraint. Replaced it with a list policy using `allValues: DENY`.
- The IAM domain restriction example omitted the supported `is:` prefix for `constraints/iam.allowedPolicyMemberDomains`. Added the prefix.
- The audit log bucket section claimed 7-year retention as an ITAR requirement. Reworded it to align retention with the organization's records policy.
- The Security Command Center section used an unsupported `gcloud scc settings update --enable-modules` command. Replaced it with console or organization-level onboarding guidance and kept the valid notification command.

## Review Notes
The guide remains high-level and uses placeholder IDs throughout. Readers still need to verify that every chosen product is in scope for the current ITAR control package, use required regional endpoints where applicable, and seek legal/compliance review for ITAR obligations.
