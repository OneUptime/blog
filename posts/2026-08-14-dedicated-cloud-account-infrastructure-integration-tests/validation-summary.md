# Validation Summary: What Belongs in a Cloud Account for Infrastructure Integration Tests?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Terraform integration testing and `terraform test`
- Terraform HCL
- AWS accounts and AWS Organizations
- AWS service control policies (SCPs) and IAM roles
- GitHub Actions OpenID Connect (OIDC) federation
- AWS resource tagging and cost-allocation tags
- AWS Service Quotas
- AWS Budgets and Cost Anomaly Detection
- AWS VPC networking, DNS, KMS, and audit logging
- CI/CD account leasing, cleanup, and recovery automation

## Sources Consulted

- [Terraform `test` command, state management, and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform machine-readable test cleanup and interrupt output](https://developer.hashicorp.com/terraform/internals/machine-readable-ui#test-cleanup)
- [Terraform configuration syntax and identifiers](https://developer.hashicorp.com/terraform/language/syntax/configuration#identifiers)
- [Terraform map and object expressions](https://developer.hashicorp.com/terraform/language/expressions/types#maps-objects)
- [AWS Organizations best practices for a multi-account environment](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
- [AWS Organizations authorization policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_authorization_policies.html)
- [AWS service control policy examples and permission semantics](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html)
- [AWS Organizations quotas and service limits](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html)
- [AWS Service Quotas and AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-servicequotas.html)
- [AWS Service Quotas applied values for new and lightly used accounts](https://docs.aws.amazon.com/servicequotas/latest/userguide/gs-request-quota.html)
- [GitHub Actions OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Actions OIDC configuration for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS IAM roles for OIDC federation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)
- [GitHub guidance for safely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
- [AWS guidance for tagging](https://docs.aws.amazon.com/solutions/tagging-on-aws/)
- [AWS cost-allocation tag activation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS cost-allocation tag backfill](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)
- [AWS Budgets best practices and update frequency](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html)
- [AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [Amazon VPC network address usage and quotas](https://docs.aws.amazon.com/vpc/latest/userguide/network-address-usage.html)
- [Amazon EC2 `DeleteNetworkInterface` API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DeleteNetworkInterface.html)
- [Amazon VPC Elastic IP address operations](https://docs.aws.amazon.com/vpc/latest/userguide/WorkWithEIPs.html)

## Issues Found

- The post treated Terraform state as a reusable artifact for every test harness. `terraform test` keeps each test file's state in memory and reports leftover resources and diagnostics when cleanup fails; it does not leave a normal reusable state file. The text now distinguishes custom apply/destroy harnesses with persistent state from `terraform test` and tells operators to retain cleanup output and an identifier manifest.
- The recovery procedure always instructed operators to retry destroy with preserved state. It now makes that step conditional on persistent state being available and directs `terraform test` users to its cleanup output and manifest for manual cleanup.
- The GitHub OIDC wording implied that an AWS trust policy could directly identify an exact workflow by default. The default `sub` claim identifies the repository plus an execution context such as a branch, the `pull_request` event, or an environment. The text now describes those supported trust conditions precisely.
- The fork warning described all fork-triggered workflows as unsafe. The actual risk is a privileged workflow executing untrusted fork code, so the warning was narrowed to that condition.
- The post claimed that exhausting a network-interface or public-IP quota could prevent the same run's destroy operation. Those quotas block create, attach, or assign operations, while deletion or release does not require unused quota. The text now explains that exhaustion can fail later create or update operations, leave a partial run, and complicate recovery.

## Review Notes

- The HCL `locals` snippet is syntactically valid and already follows `terraform fmt` output. Hyphens are valid in Terraform identifiers, so the unquoted tag keys are accepted.
- AWS cost-allocation-tag activation is prospective by default. A management-account user can explicitly request up to 12 months of backfill when the tags existed on the resources, so the post's qualified warning that allocation is not necessarily retroactive remains accurate.
- A Region allowlist is only one part of data-location enforcement: global services need explicit handling, and `aws:RequestedRegion` does not by itself prevent all cross-Region effects.
- GitHub repositories created after July 15, 2026, as well as repositories that opt in or subsequently move or rename, can use immutable owner and repository IDs in the OIDC `sub` format. The post contains no literal subject values that need updating.
- All documentation links in the post resolved to the intended current official pages. The post does not pin technology versions, and no deprecated commands or APIs were found.
