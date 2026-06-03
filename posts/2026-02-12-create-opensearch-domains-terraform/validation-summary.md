# Validation Summary: How to Create OpenSearch Domains with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- AWS Terraform provider
- Terraform HCL
- AWS IAM service-linked roles
- AWS KMS
- Amazon VPC security groups
- Amazon CloudWatch alarms and metrics

## Sources Consulted
- Terraform Registry: `aws_opensearch_domain` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Terraform Registry: `aws_opensearch_domain_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain_policy
- Terraform Registry: `aws_iam_service_linked_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_service_linked_role
- AWS OpenSearch Service Developer Guide: Dedicated master nodes: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-dedicatedmasternodes.html
- AWS OpenSearch Service Developer Guide: Multi-AZ domains: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html
- AWS OpenSearch Service Developer Guide: Service-linked roles for VPC domains: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/slr-aos.html
- AWS OpenSearch Service Developer Guide: Fine-grained access control: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html
- AWS OpenSearch Service Developer Guide: Creating index snapshots: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshots.html
- AWS OpenSearch Service Developer Guide: CloudWatch metrics: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html
- AWS OpenSearch Service Developer Guide: Recommended CloudWatch alarms: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html
- AWS OpenSearch Service Developer Guide: Service quotas and EBS gp3 limits: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html

## Issues Found
- The Auto-Tune maintenance schedule used `2026-03-01T00:00:00Z`, which is in the past as of this validation date. Updated it to `2026-07-05T00:00:00Z` so the Terraform example remains applyable.
- The VPC domain example described creating the required OpenSearch service-linked role with Terraform, but the domain resource had no dependency on that role. Added `depends_on = [aws_iam_service_linked_role.opensearch]` so Terraform creates the role before the VPC domain when both are applied together.
- The snapshot section said OpenSearch takes automated snapshots daily and showed a start-hour option for an OpenSearch 2.11 domain. AWS documents that OpenSearch and Elasticsearch 5.3 or later domains receive hourly automated snapshots retained for 14 days. Updated the wording and removed the misleading start-hour block from the OpenSearch 2.11 example.
- The FreeStorageSpace alarm used `10000` with a `10 GB in MB` comment. Updated the threshold to `10240` and the text to `10 GiB in MiB` to match the binary unit convention used in AWS OpenSearch alarm guidance.

## Review Notes
The Terraform resource blocks and attribute names are current in the AWS provider documentation. `OpenSearch_2.11` is not the latest OpenSearch engine version, but it is a version-specific example rather than an invalid or deprecated Terraform API. The CloudWatch JVM alarm threshold of 80% is more conservative than AWS's recommended critical alarm threshold of 95%, but it is technically valid as an early warning threshold.
