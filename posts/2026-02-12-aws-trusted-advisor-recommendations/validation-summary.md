# Validation Summary: How to Use AWS Trusted Advisor Recommendations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Trusted Advisor
- AWS Support API
- AWS CLI
- Amazon EventBridge
- AWS Lambda
- Amazon SNS
- IAM credential reports
- Amazon EC2, Elastic IP addresses, Elastic Load Balancing, and Service Quotas

## Sources Consulted
- AWS Trusted Advisor check reference: https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor-check-reference.html
- AWS Trusted Advisor cost optimization checks: https://docs.aws.amazon.com/awssupport/latest/user/cost-optimization-checks.html
- AWS Trusted Advisor service limits checks: https://docs.aws.amazon.com/awssupport/latest/user/service-limits.html
- AWS Support API DescribeTrustedAdvisorChecks reference: https://docs.aws.amazon.com/awssupport/latest/APIReference/API_DescribeTrustedAdvisorChecks.html
- AWS CLI describe-trusted-advisor-checks reference: https://docs.aws.amazon.com/cli/latest/reference/support/describe-trusted-advisor-checks.html
- AWS CLI refresh-trusted-advisor-check example/reference: https://docs.aws.amazon.com/awssupport/latest/user/example_support_RefreshTrustedAdvisorCheck_section.html
- AWS Support TrustedAdvisorCheckRefreshStatus API reference: https://docs.aws.amazon.com/awssupport/latest/APIReference/API_TrustedAdvisorCheckRefreshStatus.html
- AWS Trusted Advisor EventBridge events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-trustedadvisor.html
- Monitoring AWS Trusted Advisor check results with Amazon EventBridge: https://docs.aws.amazon.com/awssupport/latest/user/cloudwatch-events-ta.html
- IAM credential report documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html
- AWS CLI get-credential-report reference: https://docs.aws.amazon.com/cli/latest/reference/iam/get-credential-report.html
- Amazon VPC / EC2 Elastic IP address documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- Elastic Load Balancing pricing: https://aws.amazon.com/elasticloadbalancing/pricing/

## Issues Found
- The post said Trusted Advisor has five categories. AWS currently lists six categories, including Operational Excellence. Updated the overview and added a short Operational Excellence description.
- The free/core checks list was outdated. Removed IAM Use, added AWS STS global endpoint usage across AWS Regions, and clarified that Basic/Developer plans provide console access to the listed core checks plus all service limits checks.
- The post implied programmatic Trusted Advisor access was broadly available. Clarified that AWS Support API access requires a support plan that includes Trusted Advisor API access, and that the Support API Trusted Advisor operations must use us-east-1.
- The refresh-rate statement claimed a fixed 5-minute refresh limit and a daily refresh limit. Replaced it with the documented `millisUntilNextRefreshable` behavior and noted that some automatically refreshed checks cannot be manually refreshed.
- The low-utilization EC2 description was incomplete and did not mention the check is now legacy. Updated the threshold to "10% or less CPU and 5 MB or less network I/O on at least 4 of the previous 14 days" and noted the newer EC2 cost optimization recommendations check.
- The Elastic IP cost statement was too narrow because AWS now charges for public IPv4 addresses, including Elastic IPs. Reworded it to avoid implying only unassociated Elastic IPs are charged.
- The security group CLI example only matched rules whose from-port was exactly 22. Updated the JMESPath query to catch rules that allow SSH through a wider range or all protocols from `0.0.0.0/0`.
- The IAM credential report command printed the wrong field (`access_key_1_active`) and did not actually filter keys older than 90 days. Replaced it with a CSV-aware Python filter for both access key rotation fields.
- The service limits example used a non-current check ID for the documented service-limits reference. Updated it to use the current EC2 On-Demand Instances check ID and clarified the example comment.

## Review Notes
- The AWS CLI was not installed in the local workspace, so CLI command validation was performed against official AWS CLI and API references rather than local `aws --help` output.
- The `aws support` Trusted Advisor commands are still valid for the AWS Support API, but AWS also has newer Trusted Advisor API documentation and support-plan naming. Future updates could consider rewriting the programmatic examples around the newer Trusted Advisor API where appropriate.
