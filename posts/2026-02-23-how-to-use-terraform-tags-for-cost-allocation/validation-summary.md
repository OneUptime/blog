# Validation Summary: How to Use Terraform Tags for Cost Allocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS Provider
- Terraform AzureRM Provider
- Terraform Google Provider
- AWS Cost Explorer and AWS Billing cost allocation tags
- Azure Cost Management tags
- Google Cloud labels and Cloud Billing reports
- HCP Terraform Sentinel policies
- Open Policy Agent / Rego
- AWS CLI

## Sources Consulted
- HashiCorp Terraform provider configuration tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/configure-providers
- HashiCorp Terraform import documentation: https://developer.hashicorp.com/terraform/language/import
- HashiCorp Terraform tfplan/v2 Sentinel import documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Sentinel maps documentation: https://developer.hashicorp.com/sentinel/docs/language/maps
- Terraform AWS Provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AzureRM Provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Google Provider google_compute_instance documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- AWS Billing user-defined cost allocation tags documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/custom-tags.html
- AWS CLI get-cost-and-usage command reference: https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- AWS CLI describe-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- Microsoft Cost Management tag inheritance documentation: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/enable-tag-inheritance
- Google Cloud Billing reports documentation: https://cloud.google.com/billing/docs/reports
- Google Cloud Compute Engine labels documentation: https://cloud.google.com/compute/docs/labeling-resources
- Open Policy Agent policy language documentation: https://www.openpolicyagent.org/docs/policy-language

## Issues Found
- The AWS `default_tags` description said tags apply to every resource. Updated it to say every resource that supports tagging, matching provider behavior.
- The Azure section heading referenced `default_tags`, but the snippet correctly explains that AzureRM does not natively support provider-level default tags. Updated the heading to "Azure Tags with locals."
- The reusable Terraform tagging module used `timestamp()` for a `CreatedAt` tag. This would produce changing values across plans and cause unnecessary tag diffs. Removed the dynamic tag from the module example.
- The Sentinel policy only checked creates and assumed every changed resource had a `tags` attribute. Updated it to check create and update actions and fail when required tags or the tag map are missing.
- The OPA/Rego policy used older partial-set syntax and did not deny resources with no `tags` map. Updated it to current Rego syntax using `deny contains msg if`, create/update action matching, and direct missing-key checks.
- The AWS Cost Explorer example used `End=2026-02-28` for a February report, but AWS treats the end date as exclusive. Changed it to `End=2026-03-01`.
- The EC2 untagged-instance command filtered for instances that already had the `Environment` tag, so it could not find untagged instances. Removed the tag-key filter and kept the JMESPath query to return instances missing that tag.

## Review Notes
Local `terraform`, `aws`, and `opa` binaries were not installed in the review environment, so command and syntax verification was performed against official documentation rather than local `--help` or parser output. Some cloud-provider cost allocation behavior remains service-specific, especially for AWS services that emit usage through supporting resources and Azure scopes that use tag inheritance.
