# Validation Summary: How to Create an Elasticsearch/OpenSearch Domain with OpenTofu on AWS (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- AWS OpenSearch Service (formerly Elasticsearch Service)
- HashiCorp AWS provider (~> 5.0)
- AWS VPC, Security Groups, KMS, IAM
- OpenSearch 2.11

## Sources Consulted
- HashiCorp AWS Provider docs for `aws_opensearch_domain` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain)
- terraform-provider-aws GitHub repository documentation source (website/docs/r/opensearch_domain.html.markdown)
- AWS OpenSearch Service documentation for engine versions, instance types, and TLS security policies

## Issues Found
1. **`kibana_endpoint` attribute does not exist on `aws_opensearch_domain`.** When AWS rebranded Kibana to OpenSearch Dashboards, the Terraform AWS provider exposed the new endpoint via the `dashboard_endpoint` attribute (with `dashboard_endpoint_v2` for the dual-stack endpoint). Updated the output block to reference `aws_opensearch_domain.main.dashboard_endpoint` and renamed the output to `opensearch_dashboard_endpoint` to match.
2. **Undeclared `data.aws_caller_identity.current` reference.** The access policy interpolates `data.aws_caller_identity.current.account_id`, but the data source was never declared, so the snippet would fail `tofu plan` with an "undeclared resource" error. Added `data "aws_caller_identity" "current" {}` to Step 1 alongside the provider block.

## Review Notes
- The `aws_security_group` resource in Step 2 omits an explicit `egress` block. With the AWS provider, this removes the default "allow all outbound" rule, which is generally desired for least-privilege but worth noting — some readers may need to add an egress rule if the OpenSearch domain ever needs outbound connectivity (e.g., custom packages from S3).
- `tls_security_policy = "Policy-Min-TLS-1-2-2019-07"` is still valid, though AWS now also offers `Policy-Min-TLS-1-2-PFS-2023-10` (with Perfect Forward Secrecy) as a stronger option.
- `m6g.large.search` instance type is current and valid for OpenSearch Service.
- `engine_version = "OpenSearch_2.11"` is a valid engine version, though newer 2.x versions are now available; the post does not claim to use the latest.
- The `auto_tune_options` block does not include a `maintenance_schedule`, which is fine when `desired_state = "ENABLED"` and off-peak windows are acceptable, but readers running production workloads may want to configure one.
