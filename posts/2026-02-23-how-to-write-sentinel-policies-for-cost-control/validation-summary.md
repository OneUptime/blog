# Validation Summary: How to Write Sentinel Policies for Cost Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform cost estimation
- HashiCorp Sentinel policy language
- Terraform Sentinel imports: `tfrun`, `tfplan/v2`, and `tfstate/v2`
- Terraform AWS provider resources for EC2, EBS, RDS, NAT Gateway, and managed services
- AWS NAT Gateway pricing concepts

## Sources Consulted
- HashiCorp Developer: `tfrun` Sentinel import reference - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- HashiCorp Developer: HCP Terraform cost estimation overview - https://developer.hashicorp.com/terraform/enterprise/cost-estimation
- HashiCorp Developer: `tfplan/v2` Sentinel import reference - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Developer: `tfstate/v2` Sentinel import reference - https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfstate-v2
- HashiCorp Developer: Sentinel language specification - https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Developer: Sentinel conditionals - https://developer.hashicorp.com/sentinel/docs/language/conditionals
- Terraform Registry: AWS provider `aws_ebs_volume` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- Terraform Registry: AWS provider `aws_db_instance` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS Documentation: NAT gateway pricing - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- AWS Pricing: Amazon VPC pricing - https://aws.amazon.com/vpc/pricing/

## Issues Found
- The post used `tfrun.cost_estimation.*`, but the official `tfrun` Sentinel import exposes cost data under `tfrun.cost_estimate.*`. Updated all cost estimate examples to use `tfrun.cost_estimate.prior_monthly_cost`, `proposed_monthly_cost`, and `delta_monthly_cost`.
- The post described Sentinel access to cost estimates without noting the current HCP Terraform limitation. Added that cost estimation is available to Sentinel through HCP Terraform legacy policy checks.
- Sentinel examples were fenced as `python`, which is technically inaccurate and can mislead readers or syntax highlighters. Updated code fences to `sentinel`.
- The NAT gateway count example added existing and newly created gateways but did not subtract gateways being deleted, so replacement or deletion plans could be overcounted. Added a `deleted_nat_gateways` filter and subtracted it from the projected count.
- The NAT gateway pricing text stated a fixed `$32/month plus $0.045/GB` cost. AWS pricing is region-dependent, so the text now frames this as approximate pricing in many US regions and uses general per-GB data processing wording.

## Review Notes
The examples use `float()` for currency values. HashiCorp's current cost estimation documentation shows the optional `decimal` import for more accurate currency math, but `float()` remains a valid Sentinel built-in and the examples are acceptable for simple threshold checks.
