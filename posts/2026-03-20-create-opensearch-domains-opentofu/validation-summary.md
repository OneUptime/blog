# Validation Summary: How to Create AWS OpenSearch Domains with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide (Infrastructure as Code)

## Technologies Covered
- OpenTofu (Terraform-compatible HCL syntax)
- AWS OpenSearch Service
- AWS Identity and Access Management (IAM)
- AWS KMS (for encryption at rest)
- AWS VPC / Security Groups
- AWS CloudWatch (logs and metric alarms)
- AWS SNS (alerting)

## Sources Consulted
- AWS provider `aws_opensearch_domain` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- AWS provider `aws_opensearch_domain_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain_policy
- AWS OpenSearch Service supported instance types: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
- AWS OpenSearch Service supported engine versions: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-versions.html
- AWS OpenSearch CloudWatch metrics (namespace `AWS/ES`): https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html
- AWS OpenSearch fine-grained access control: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html
- AWS OpenSearch IAM action reference (`es:` prefix retained): https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonopensearchservice.html
- AWS OpenSearch slow log types (INDEX_SLOW_LOGS, SEARCH_SLOW_LOGS, ES_APPLICATION_LOGS, AUDIT_LOGS): https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createdomain-configure-slow-logs.html
- AWS provider `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
No technical issues found.

The post correctly uses:
- The current `aws_opensearch_domain` resource (not the legacy `aws_elasticsearch_domain`).
- Valid `engine_version` format `OpenSearch_2.11`.
- Graviton-based instance types with the `.search` suffix (`r6g.large.search`).
- Correct nested blocks for `cluster_config`, `zone_awareness_config`, `ebs_options`, `encrypt_at_rest`, `node_to_node_encryption`, `domain_endpoint_options`, `advanced_security_options` (with `master_user_options`), `vpc_options`, and multiple `log_publishing_options` blocks.
- Correct gp3 EBS configuration with `throughput` and `iops`.
- The legacy `es:` IAM action prefix (which AWS retained for backward compatibility on OpenSearch domains).
- The legacy `AWS/ES` CloudWatch namespace (still used for OpenSearch metrics).
- Valid `ClusterStatus.red` metric name with `DomainName` and `ClientId` dimensions.
- Valid `dashboard_endpoint` and `endpoint` resource attributes for outputs.
- A correct fine-grained access control configuration (`internal_user_database_enabled = false` paired with `master_user_arn` for IAM-based auth).

## Review Notes
- `tls_security_policy = "Policy-Min-TLS-1-2-2019-07"` is valid and supported, though AWS has since introduced newer policies such as `Policy-Min-TLS-1-2-PFS-2023-10` that enforce perfect forward secrecy. The post's choice is technically correct; teams may consider upgrading to the newer policy in future deployments.
- The post wisely notes "Minimum 3 for HA" on `instance_count`, which aligns with AWS's recommendation for production multi-AZ deployments.
- The access policy uses fairly broad `es:ESHttp*` actions; in production, teams may want to scope this further to specific indices via the resource ARN, but this is an editorial recommendation rather than a correctness issue.
- The CloudWatch alarm uses `period = 60`, which is a 1-minute period — supported but billed as detailed monitoring; this is a cost consideration rather than a correctness issue.
