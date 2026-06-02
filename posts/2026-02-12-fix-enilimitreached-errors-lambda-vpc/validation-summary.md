# Validation Summary: How to Fix 'ENILimitReached' Errors in Lambda VPC

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS Lambda
- Amazon VPC
- Elastic Network Interfaces (ENIs)
- AWS Hyperplane ENIs
- AWS CLI
- AWS Service Quotas
- Boto3 for Python
- Amazon SNS

## Sources Consulted
- AWS Lambda Developer Guide: Giving Lambda functions access to resources in an Amazon VPC: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda API Reference: Invoke errors, including ENILimitReachedException: https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
- Amazon VPC User Guide: Amazon VPC quotas: https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS CLI Command Reference: ec2 describe-network-interfaces: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html
- AWS CLI Command Reference: service-quotas get-service-quota: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/get-service-quota.html
- AWS CLI Command Reference: service-quotas request-service-quota-increase: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/request-service-quota-increase.html
- AWS CLI Command Reference: lambda update-function-configuration: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- Boto3 EC2 Client Reference: describe_network_interfaces: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_network_interfaces.html
- AWS re:Post Knowledge Center: Find and delete elastic network interfaces created by Lambda: https://repost.aws/knowledge-center/lambda-eni-find-delete
- AWS Compute Blog: Announcing improved VPC networking for AWS Lambda functions: https://aws.amazon.com/blogs/compute/announcing-improved-vpc-networking-for-aws-lambda-functions/

## Issues Found
- The Lambda ENI lookup used a description filter that is outdated for current managed ENIs. Changed it to use `--include-managed-resources` and the `interface-type=lambda` filter, which is supported by current EC2 `describe-network-interfaces` documentation.
- The post said available ENIs can be safely deleted and included a bulk-delete script for Lambda ENIs. Changed this because Lambda-managed ENIs should normally be deleted by Lambda after removing the resource or VPC configuration that uses them; manual deletion is only appropriate after confirming the ENI is unused and Lambda cannot clean it up.
- The quota wording said the default is simply 5,000 per Region. Updated it to reflect AWS's current VPC quota wording: the quota is listed as 5,000 network interfaces per Region and enforced per Availability Zone.
- The quota increase section said approval is automatic in most cases and takes a few minutes. Changed it to say approval and timing vary, which matches AWS Service Quotas behavior more accurately.
- The Hyperplane section implied old pre-2019 functions might need a VPC config re-apply to use Hyperplane ENIs. Updated this because Hyperplane ENIs are now the default and the relevant operational concern is the subnet/security group combinations in the function's VPC configuration.
- The post described a strict one-ENI-per-combination model without noting scaling for connection volume. Updated it to mention that Lambda can add ENIs when connection volume requires it.
- The monitoring example used a single `describe_network_interfaces()` call, which can undercount accounts with multiple pages of ENIs. Updated the Boto3 example to use a paginator and `IncludeManagedResources=True`.
- The monitoring section called the sample a CloudWatch alarm, but the code is a scheduled Lambda-style monitor that publishes to SNS. Updated the wording to avoid claiming it creates a CloudWatch alarm.

## Review Notes
The revised post is technically accurate as a troubleshooting guide. In the future, the monitoring example could be expanded to publish a custom CloudWatch metric and create a real CloudWatch alarm, but that would be an enhancement rather than a correctness fix.
