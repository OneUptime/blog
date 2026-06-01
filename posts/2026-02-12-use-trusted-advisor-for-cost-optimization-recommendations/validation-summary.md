# Validation Summary: How to Use Trusted Advisor for Cost Optimization Recommendations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Trusted Advisor
- AWS Support API
- AWS CLI
- Amazon EventBridge
- Amazon SNS
- Amazon EC2
- Elastic Load Balancing
- Amazon EBS
- Elastic IP addresses
- Python
- boto3

## Sources Consulted
- AWS Support Plans documentation: https://docs.aws.amazon.com/awssupport/latest/user/aws-support-plans.html
- AWS Support pricing: https://aws.amazon.com/premiumsupport/pricing/
- AWS Trusted Advisor documentation: https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html
- AWS Trusted Advisor cost optimization check reference: https://docs.aws.amazon.com/awssupport/latest/user/cost-optimization-checks.html
- AWS Support API DescribeTrustedAdvisorChecks: https://docs.aws.amazon.com/awssupport/latest/APIReference/API_DescribeTrustedAdvisorChecks.html
- AWS Support API DescribeTrustedAdvisorCheckResult: https://docs.aws.amazon.com/awssupport/latest/APIReference/API_DescribeTrustedAdvisorCheckResult.html
- AWS Support API RefreshTrustedAdvisorCheck: https://docs.aws.amazon.com/awssupport/latest/APIReference/API_RefreshTrustedAdvisorCheck.html
- boto3 Support refresh_trusted_advisor_check reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/support/client/refresh_trusted_advisor_check.html
- Amazon EventBridge AWS Trusted Advisor events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-trustedadvisor.html
- AWS Cloud Operations Blog sample Trusted Advisor EventBridge event: https://aws.amazon.com/blogs/mt/auto-remediate-best-practice-deviations-detected-by-aws-trusted-advisor/
- AWS CLI modify-instance-attribute reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html

## Issues Found
- The post described a free Trusted Advisor cost optimization tier and listed EC2 Reserved Instance lease expiration and S3 Bucket Permissions as free cost checks. Current AWS documentation says Basic Support has core checks in Service Quotas plus selected Security and Fault tolerance checks, while cost optimization checks require a paid plan with the full Trusted Advisor check set. Updated the support-plan explanation and check access section.
- The post used outdated paid support plan wording and pricing. Updated references to AWS Business Support+, AWS Enterprise Support, and AWS Unified Operations, and changed the starting Business Support+ price to $29/month per account.
- The post did not state that Trusted Advisor operations through the AWS Support API require a paid support plan and must use `us-east-1`. Added that note and `--region us-east-1` to the CLI examples.
- Several cost optimization check names were outdated or inaccurate. Updated Redshift, Lambda, and S3 check names to match the current Trusted Advisor check reference.
- The Python refresh example caught `support.exceptions.InvalidParameterValueException`, but boto3 documents `InvalidParameterValue` as a service error for non-refreshable checks rather than a generated client exception for this operation. Updated the example to catch `botocore.exceptions.ClientError` and inspect the error code.
- The EventBridge rule filtered `detail.check-item-detail.status` with lowercase `warning` and `error`. Trusted Advisor events expose top-level `detail.status` values such as `WARN` and `ERROR`. Updated the event pattern.
- The EC2 right-sizing command passed `--instance-type t3.small`, but the AWS CLI expects the structured `InstanceAttributeValue` form for `modify-instance-attribute`. Updated it to `--instance-type '{"Value": "t3.small"}'`.
- The Idle Load Balancers section described ALBs and used `elbv2`, but the Trusted Advisor Idle Load Balancers check is for Classic Load Balancers. Updated the description and deletion command to `aws elb delete-load-balancer`.
- The Underutilized EBS Volumes section described switching volume types, but Trusted Advisor's legacy underutilized volume check recommends snapshotting and deleting unattached or very low IOPS volumes. Updated the description and command example.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI behavior was verified against official AWS CLI documentation rather than local `--help` output.
- The embedded Python examples were syntax-checked with Python 3.
