# Validation Summary: How to Enable EKS Control Plane Logging and Send to CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes control plane audit logging
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- CloudWatch metric filters and alarms
- AWS KMS
- Amazon Data Firehose
- Terraform AWS provider

## Sources Consulted
- Amazon EKS control plane logs: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- AWS CLI `eks update-cluster-config`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-config.html
- CloudWatch Logs KMS encryption: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- CloudWatch Logs filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- CloudWatch Logs subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- AWS CLI `firehose create-delivery-stream`: https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- Kubernetes audit event API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Terraform AWS provider `aws_eks_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster

## Issues Found
- API server logs were described as recording every API request with user and object details. Changed this to describe API server logs as diagnostic output, and moved the API request query wording to audit logs, which contain the Kubernetes audit event fields used in the examples.
- The audit log description overstated compliance requirements. Changed the wording to say audit logs are often required, because requirements vary by environment and regulation.
- The CloudWatch Logs KMS policy used the global `logs.amazonaws.com` service principal and included actions that did not match the AWS example. Updated it to the regional `logs.us-east-1.amazonaws.com` principal and the documented KMS action set.
- The authentication metric filter used `==`, but CloudWatch Logs filter patterns use `=` for equality. Updated the filter pattern to `{ $.responseStatus.code = 401 }`.
- The Firehose subscription filter omitted `--role-arn`, which is required for CloudWatch Logs to deliver to Firehose. Added the role ARN.
- The Firehose creation command used deprecated `--s3-destination-configuration`. Replaced it with `--extended-s3-destination-configuration`.
- The SIEM destination text referred to Elasticsearch. Updated it to Amazon OpenSearch Service to match current AWS service naming.
- The cost management example used an unsupported `random()` function in a CloudWatch Logs subscription filter pattern. Replaced it with a valid JSON filter pattern that forwards only write-oriented audit events and clarified that this reduces downstream processing and storage costs, not CloudWatch ingestion costs.
- The Terraform snippet attempted to manage the EKS log group using `aws_eks_cluster.main.name`, which would make Terraform create the log group after the cluster and risk a conflict with the EKS-created log group. Added a local cluster name and `depends_on` so the log group is pre-created before EKS logging is enabled.

## Review Notes
The AWS CLI was not installed in the workspace, so command validation was performed against current official AWS CLI reference documentation instead of local `--help` output.
