# Validation Summary: How to Configure OpenSearch Access Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL syntax)
- AWS OpenSearch Service
- AWS IAM (resource-based policies, condition keys)
- AWS Provider for Terraform (`aws_opensearch_domain`, `aws_opensearch_domain_policy`, `aws_iam_role`, `aws_iam_role_policy`)
- Fine-Grained Access Control (FGAC) for OpenSearch
- VPC condition-based access restrictions

## Sources Consulted
- AWS Service Authorization Reference for OpenSearch — https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonopensearchservice.html (verified `es:ESHttpGet`, `es:ESHttpPost`, `es:ESHttpPut`, `es:ESHttpDelete`, `es:ESHttpHead`, `es:ESHttpPatch` are all valid actions)
- AWS OpenSearch Service Developer Guide (TLS security policies) — https://docs.aws.amazon.com/opensearch-service/latest/developerguide/customer-managed-domains.html (confirmed `Policy-Min-TLS-1-2-2019-07` is valid)
- Terraform AWS Provider Registry — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain (verified resource schema for `aws_opensearch_domain` and `aws_opensearch_domain_policy`)
- AWS Global Condition Context Keys — verified `aws:SourceIp` and `aws:SourceVpc` are valid IAM condition keys

## Issues Found
No technical issues found.

All code examples were verified to be correct:
- HCL syntax is valid, including the use of `#` comments inside `jsonencode()` object expressions
- IAM action names (`es:ESHttp*` family) are all current and valid
- The `aws_opensearch_domain` resource schema correctly uses: `cluster_config`, `ebs_options`, `encrypt_at_rest`, `node_to_node_encryption`, `domain_endpoint_options`, and `advanced_security_options` with `master_user_options`
- TLS policy value `Policy-Min-TLS-1-2-2019-07` is valid (newer policies like `Policy-Min-TLS-1-2-PFS-2023-10` and `Policy-Min-TLS-1-3-2024-04` also exist but the older one is still supported)
- Engine version `OpenSearch_2.11` is a valid OpenSearch engine version
- Instance type `r6g.large.search` is a valid OpenSearch instance type
- IAM condition keys `aws:SourceIp` and `aws:SourceVpc` are correct
- IAM policy `Version` value `"2012-10-17"` is the current valid policy language version
- The single-line HCL block syntax (`encrypt_at_rest { enabled = true }`) is valid

## Review Notes
- The post uses TLS policy `Policy-Min-TLS-1-2-2019-07`. While valid, AWS now offers newer policies such as `Policy-Min-TLS-1-2-PFS-2023-10` (with Perfect Forward Secrecy) and `Policy-Min-TLS-1-3-2024-04` (TLS 1.3). For new deployments, the newer policies may be preferable, but this is an enhancement, not a correctness issue.
- The conclusion mentions restricting access "using vpc_options with a VPC-scoped condition in the access policy" — this is a slightly mixed phrasing. Using `vpc_options` on `aws_opensearch_domain` already restricts network access to a VPC, and the `aws:SourceVpc` condition in the example would be a defense-in-depth addition. Not a technical error.
- The post does not show the `vpc_options` block itself, only references it in the conclusion and uses the `aws:SourceVpc` condition in a separate domain policy example. This is acceptable for a focused access-policies tutorial.
- The `engine_version` in the FGAC example uses `OpenSearch_2.11` — newer versions (e.g., `OpenSearch_2.13`, `OpenSearch_2.15`) are available but the version shown is still supported.
