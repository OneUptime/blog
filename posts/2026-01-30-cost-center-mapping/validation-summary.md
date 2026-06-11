# Validation Summary: How to Create Cost Center Mapping

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloud cost allocation and FinOps
- AWS tags, Cost Explorer API, and Organizations Service Control Policies
- Azure tags, Azure Policy, and Azure Cost Management APIs
- Google Cloud labels, Resource Manager tags, Organization Policy, and Billing Export
- Terraform / HCL
- Bash and jq
- Python boto3
- Kubernetes resource-based cost allocation concepts
- Mermaid diagrams

## Sources Consulted
- AWS Cost Explorer API documentation: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-api.html
- AWS GetCostAndUsage API reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- Boto3 Cost Explorer get_cost_and_usage documentation: https://docs.aws.amazon.com/goto/boto3/ce-2017-10-25/GetCostAndUsage
- AWS cost allocation tags documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- AWS user-defined cost allocation tag activation documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- AWS Organizations Service Control Policies documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- Terraform language type constraints and map/object syntax: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform AWS provider aws_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Azure tag policy documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies
- Azure Cost Management REST API documentation: https://learn.microsoft.com/en-us/rest/api/cost-management/
- Google Cloud labels overview: https://docs.cloud.google.com/resource-manager/docs/labels-overview
- Google Cloud Resource Manager tags overview: https://docs.cloud.google.com/resource-manager/docs/tags/tags-overview
- Google Cloud custom Organization Policy constraints documentation: https://docs.cloud.google.com/organization-policy/create-custom-constraints
- Google Cloud Billing export to BigQuery documentation: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery
- Related OneUptime links in the post were opened and resolved successfully.

## Issues Found
- The post described tags as the universal basis for cost allocation across providers. Google Cloud billing allocation is primarily label-based, while Resource Manager tags are distinct governance metadata. Updated the wording to distinguish Google Cloud labels for billing allocation from Resource Manager tags for supported governance policies.
- The Terraform example was labeled as requiring tags on all AWS resources but only showed one `aws_instance`, and the variable default allowed required tags to be empty. Updated the example to validate a `resource_tags` map with non-empty required keys and to describe the scope as an AWS EC2 instance.
- The CI/CD example used `grep` against the entire plan JSON, which only proved that a tag key appeared somewhere in the file, not that each resource had the required tag. Replaced it with a `terraform show -json` plus `jq` example that inspects managed resource changes with `tags` and reports resources missing required tag values.

## Review Notes
- The AWS Cost Explorer Python example is syntactically valid and uses the documented `get_cost_and_usage` request shape with two tag groupings, which is within AWS's documented grouping limit. In real AWS accounts, user-defined cost allocation tags must be activated before they are useful for cost allocation reporting.
- The Kubernetes allocation math is internally consistent and totals 100% of the $15,000 monthly cost after rounding.
- Terraform is not installed in this environment, so the HCL snippet was reviewed against HashiCorp documentation but not executed with `terraform validate`.
