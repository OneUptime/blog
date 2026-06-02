# Validation Summary: How to Schedule EC2 Instance Start and Stop to Save Costs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS EC2
- AWS Lambda
- Amazon EventBridge scheduled rules
- AWS IAM
- AWS CLI
- Python 3.12
- Boto3
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: `aws lambda invoke` - https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS Lambda Python runtime documentation - https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Amazon EC2 stop and start documentation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html
- Amazon EC2 Elastic IP address documentation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- EventBridge Scheduler schedule types and time zone documentation - https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html
- Boto3 EC2 `describe_instances` and paginator documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_instances.html and https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/paginator/DescribeInstances.html
- Terraform AWS provider documentation for EventBridge targets and Lambda permissions - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission

## Issues Found
- The Lambda test commands passed raw JSON payloads without `--cli-binary-format raw-in-base64-out`, which is required for raw JSON payloads when using AWS CLI v2. Added the flag to both `aws lambda invoke` examples.
- The Lambda function used a single `describe_instances` call. AWS and Boto3 recommend pagination for `DescribeInstances`, and a single call can miss results in larger accounts. Updated the function to use the Boto3 `describe_instances` paginator.
- The EventBridge rule comments described 8 AM and 6 PM US Eastern as fixed UTC times. Those UTC conversions are correct for Eastern Standard Time but not during daylight saving time. Clarified that the examples are for Eastern Standard Time and added a note to adjust UTC hours during daylight saving time or use EventBridge Scheduler with `America/New_York`.
- The Terraform example created EventBridge targets for Lambda but did not grant EventBridge permission to invoke the Lambda function. Added `aws_lambda_permission` resources for the start and stop rules.
- The Terraform section called the snippet a complete setup even though it relies on IAM role and package resources outside the snippet. Changed the wording to describe it as the Lambda and EventBridge resources.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI documentation rather than local `--help` output. The EC2 stop/start edge-case notes are accurate for EBS-backed instances, instance store volumes, and current Elastic IP/public IPv4 charging behavior.
