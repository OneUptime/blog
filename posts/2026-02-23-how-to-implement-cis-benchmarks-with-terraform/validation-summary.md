# Validation Summary: How to Implement CIS Benchmarks with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS CIS Foundations Benchmark
- AWS Config managed rules
- AWS CloudTrail
- Amazon CloudWatch Logs metric filters and alarms
- Amazon S3
- Amazon EBS
- Amazon RDS
- Amazon VPC Flow Logs
- AWS Security Hub CSPM

## Sources Consulted
- AWS Security Hub CIS AWS Foundations Benchmark documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html
- AWS Security Hub CloudWatch controls documentation: https://docs.aws.amazon.com/securityhub/latest/userguide/cloudwatch-controls.html
- AWS Config managed rules list: https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html
- AWS Config `root-account-mfa-enabled` managed rule: https://docs.aws.amazon.com/config/latest/developerguide/root-account-mfa-enabled.html
- AWS Config `restricted-common-ports` managed rule: https://docs.aws.amazon.com/config/latest/developerguide/restricted-common-ports.html
- Terraform AWS Provider `aws_securityhub_standards_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- Terraform AWS Provider `aws_cloudwatch_log_metric_filter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS Provider `aws_config_configuration_recorder` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_configuration_recorder

## Issues Found
- The Security Hub standards ARN used the legacy `ruleset` ARN form with CIS v1.4.0. Updated it to the current regional `standards/cis-aws-foundations-benchmark/v/1.4.0` ARN form and used Terraform AWS partition and region data sources.
- Several CIS control numbers were mapped to the wrong CIS AWS Foundations Benchmark version. Updated IAM, S3, networking, and VPC Flow Logs headings/comments to match the v1.4.0 mappings documented by AWS Security Hub.
- The S3 encryption example was labeled as CIS 2.1.2, but CIS v1.4.0 maps 2.1.2 to requiring SSL/TLS for bucket requests. Changed the encryption label to a general hardening comment and corrected the S3 public access control labels.
- The CloudWatch monitoring map omitted several controls while the heading claimed 4.1-4.14 coverage. Added metric filter entries for console authentication failures, KMS key changes, S3 bucket policy changes, AWS Config changes, network gateway changes, and route table changes.
- The unauthorized API call filter used `*UnauthorizedAccess*`, but AWS Security Hub documentation prescribes `*UnauthorizedOperation` or `AccessDenied*`. Updated the pattern.
- The console sign-in without MFA pattern did not include the IAM user and successful-login predicates from AWS Security Hub's documented remediation. Updated the pattern.
- The CloudWatch metric namespace used `CISBenchmark` and lacked a default value. Updated the metric transformation and alarm namespace to `LogMetrics` with `default_value = "0"`, matching AWS Security Hub's remediation values.
- The networking section title referred to Network ACL control 5.1, but the Terraform shown checked security groups and the default security group. Updated the heading to cover unrestricted admin port access controls 5.2-5.4 instead.

## Review Notes
- The Terraform snippets are examples and intentionally reference supporting resources such as KMS keys, IAM roles, log groups, VPCs, and S3 buckets that are not fully defined in the post.
- CIS AWS Foundations Benchmark mappings vary by benchmark version. The post now aligns the Security Hub subscription and most numbered comments with CIS v1.4.0, while it keeps two older CloudWatch examples explicitly labeled as CIS v1.2 examples.
- AWS Security Hub now recommends newer CIS benchmark versions, including v5.0.0, but the v1.4.0 subscription remains supported.
