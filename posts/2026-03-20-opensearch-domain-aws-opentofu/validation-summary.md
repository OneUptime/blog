# Validation Summary: How to Create an Elasticsearch/OpenSearch Domain with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS OpenSearch Service (managed Elasticsearch/OpenSearch)
- AWS provider for Terraform (`hashicorp/aws`)
- Random provider for Terraform (`hashicorp/random`)
- AWS VPC, Security Groups, KMS, CloudWatch Logs

## Sources Consulted
- Terraform AWS provider docs — `aws_opensearch_domain`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Terraform AWS provider docs — `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider CHANGELOG (v6.0.0 breaking changes): https://github.com/hashicorp/terraform-provider-aws/blob/main/CHANGELOG.md
- Terraform random provider docs — `random_password`: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- AWS OpenSearch Service Developer Guide — Supported instance types: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
- AWS OpenSearch Service Developer Guide — Supported engine versions

## Issues Found
1. **`kibana_endpoint` attribute removed from `aws_opensearch_domain`.** The post originally exposed `aws_opensearch_domain.main.kibana_endpoint` as an output. This attribute was removed in the AWS provider v6.0.0 (released 2025-06-18) and replaced by `dashboard_endpoint`. Using `kibana_endpoint` will fail to plan/apply on any current AWS provider version. Changed the output to `dashboard_endpoint` accordingly and renamed the output key from `kibana_endpoint` to `dashboard_endpoint`.

## Review Notes
- All other resource arguments (`cluster_config`, `ebs_options`, `vpc_options`, `encrypt_at_rest`, `node_to_node_encryption`, `domain_endpoint_options`, `advanced_security_options`, `log_publishing_options`, `tags`) are spelled correctly and match the current AWS provider schema.
- `engine_version = "OpenSearch_2.13"` follows the documented `OpenSearch_X.Y` format and is a real, supported version on AWS OpenSearch Service.
- `tls_security_policy = "Policy-Min-TLS-1-2-2019-07"` is a valid value; AWS also offers a stricter `Policy-Min-TLS-1-2-PFS-2023-10` policy that readers may prefer for new deployments.
- `INDEX_SLOW_LOGS` is one of the four valid `log_type` values (`INDEX_SLOW_LOGS`, `SEARCH_SLOW_LOGS`, `ES_APPLICATION_LOGS`, `AUDIT_LOGS`).
- `r6g.large.search` is a valid OpenSearch instance type per the AWS Developer Guide.
- The example references `aws_cloudwatch_log_group.opensearch` without showing the resource definition, and OpenSearch additionally requires a CloudWatch Logs resource policy (`aws_cloudwatch_log_resource_policy`) granting `es.amazonaws.com` permission to write to that log group. Not technically incorrect in the snippet shown, but readers wiring this up end-to-end will need both resources for log publishing to actually work.
- The Description frontmatter mentions "automated snapshots", which AWS OpenSearch performs automatically on a managed schedule; the post body itself does not configure custom snapshots. This is descriptive rather than incorrect.
