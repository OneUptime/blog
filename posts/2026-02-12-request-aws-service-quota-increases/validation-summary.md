# Validation Summary: How to Request AWS Service Quota Increases

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Service Quotas
- AWS CLI
- AWS Support Center and Support API
- AWS Organizations quota request templates
- Python boto3
- Amazon EC2, Amazon VPC, AWS Lambda, Elastic Load Balancing, Amazon RDS, Amazon EBS

## Sources Consulted
- AWS CLI Command Reference: request-service-quota-increase: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/request-service-quota-increase.html
- AWS Service Quotas User Guide: Requesting a quota increase: https://docs.aws.amazon.com/servicequotas/latest/userguide/request-quota-increase.html
- AWS Service Quotas User Guide: Using Service Quotas request templates: https://docs.aws.amazon.com/servicequotas/latest/userguide/organization-templates.html
- AWS CLI Command Reference: list-requested-service-quota-change-history: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/list-requested-service-quota-change-history.html
- AWS CLI Command Reference: create-support-case: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/create-support-case.html
- AWS CLI Command Reference: support create-case: https://docs.aws.amazon.com/cli/latest/reference/support/create-case.html
- AWS Lambda documentation: Understanding Lambda function scaling: https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
- Amazon EC2 documentation: Amazon EC2 service quotas: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-resource-limits.html
- AWS General Reference: Elastic Load Balancing endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/elb.html
- AWS General Reference: Amazon EBS endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/ebs-service.html
- Amazon RDS documentation: Quotas and constraints for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- boto3 Service Quotas client documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/service-quotas.html

## Issues Found
- The AWS CLI command for listing quota increase history was written as `list-requested-service-quota-changes-in-history`, which is not the current AWS CLI command. Changed it to `list-requested-service-quota-change-history`.
- The boto3 method for listing quota increase history was written as `list_requested_service_quota_changes_in_history`, which is not the boto3 client method. Changed it to `list_requested_service_quota_change_history`.
- EC2 On-Demand quota examples described the quota as an instance count. AWS manages these EC2 quotas in vCPUs for instance family groups, so the affected text and example labels now say On-Demand Standard instance vCPUs.
- The post showed `aws support create-case` as a way to submit service limit increase requests. AWS Support API documentation states that `CreateCase` does not support service limit increase requests directly. Replaced those examples with Support Center guidance and removed the invalid CLI examples.
- The request status list omitted current possible statuses `NOT_APPROVED` and `INVALID_REQUEST`. Added both statuses.
- The support-level tip implied quota increase requests receive priority support. AWS Service Quotas documentation says quota increase requests do not receive priority support, so the wording now distinguishes quota requests from urgent production-impact support cases.

## Review Notes
Some quota codes are service-specific and region/account behavior can vary, so operators should still verify quota names and current applied values with `list-service-quotas` in the target account and Region before submitting requests.
