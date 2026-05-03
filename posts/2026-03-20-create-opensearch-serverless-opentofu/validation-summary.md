# Validation Summary: How to Create AWS OpenSearch Serverless with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS OpenSearch Serverless (collections, security policies, access policies, VPC endpoints)
- HCL configuration language
- AWS IAM (role principals)

## Sources Consulted
- Terraform AWS Provider GitHub source for `aws_opensearchserverless_collection` (https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/opensearchserverless_collection.html.markdown)
- AWS OpenSearch Serverless data access control docs (https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html)
- AWS OpenSearch Serverless encryption policy and network policy reference

## Issues Found
No technical issues found.

Verified items:
- `aws_opensearchserverless_collection` accepts `type` values `SEARCH`, `TIMESERIES`, `VECTORSEARCH` (correct).
- Exported attributes `collection_endpoint` and `dashboard_endpoint` are valid.
- `aws_opensearchserverless_security_policy` `type` argument values `encryption` and `network` are valid.
- Encryption policy JSON is a single object containing `Rules` and `AWSOwnedKey` (correct format).
- Network and data access policy JSON are JSON arrays containing rule objects (correct format).
- All AOSS permissions used are valid:
  - Index: `aoss:CreateIndex`, `aoss:DeleteIndex`, `aoss:UpdateIndex`, `aoss:DescribeIndex`, `aoss:ReadDocument`, `aoss:WriteDocument`.
  - Collection: `aoss:DescribeCollectionItems`.
- Network policy `dashboard` resource type is valid (controls Dashboards endpoint access).
- `aws_opensearchserverless_vpc_endpoint` arguments (`name`, `vpc_id`, `subnet_ids`, `security_group_ids`) match the provider schema.
- Resource ARN patterns (`collection/<name>`, `index/<collection>/<pattern>`) match AWS specification.
- Use of `depends_on` for ordering security policies before collection creation matches AWS recommendation (collection creation requires both encryption and network policies to exist).

## Review Notes
- The principals used in the data access policy (`aws_iam_role.app.arn`, `aws_iam_role.log_shipper.arn`) and security group (`aws_security_group.opensearch.id`) are referenced but not defined in the post; readers must define these themselves. This is a reasonable scope choice for a focused tutorial.
- Per AWS docs, IAM principals also need `aoss:APIAccessAll` (and `aoss:DashboardsAccessAll` for Dashboards) on the IAM side for the data access policy to be effective. The post does not mention this — it's outside the OpenTofu resource scope but worth noting for readers who try the example end-to-end.
- The encryption policy uses `AWSOwnedKey = true`; for customer-managed keys (CMK), the field is `KmsARN` with the key ARN (and `AWSOwnedKey` should be omitted/false). The inline comment alludes to this correctly.
- Collection names must be lowercase, 3–28 characters, and start with a letter; `application-logs` and the keys in the multiple-collections example satisfy this.
