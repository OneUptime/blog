# Validation Summary: How to Create CloudTrail Trails for Multi-Region Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudTrail trails
- AWS CloudTrail organization trails
- AWS CloudTrail data events and advanced event selectors
- AWS CloudTrail Insights
- Amazon S3 bucket policies for CloudTrail log delivery
- Amazon EventBridge rules for CloudTrail events
- AWS CLI
- Terraform AWS provider
- Python / boto3 Lambda alerting

## Sources Consulted
- AWS CLI Command Reference: `cloudtrail create-trail` - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/create-trail.html
- AWS CLI Command Reference: `cloudtrail put-event-selectors` - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/put-event-selectors.html
- AWS CLI Command Reference: `cloudtrail put-insight-selectors` - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/put-insight-selectors.html
- AWS CLI Command Reference: `events put-rule` - https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CloudTrail User Guide: creating and updating trails with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail-by-using-the-aws-cli-create-trail.html
- AWS CloudTrail User Guide: creating an organization trail with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-an-organizational-trail-by-using-the-aws-cli.html
- AWS CloudTrail User Guide: preparing for organization trails - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-an-organizational-trail-prepare.html
- AWS CloudTrail User Guide: S3 bucket policy for CloudTrail - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail User Guide: CloudTrail concepts and global service events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html
- AWS CloudTrail User Guide: supported data event resource types - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/eventreference.html
- AWS CloudTrail User Guide: working with CloudTrail Insights - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-insights-events-with-cloudtrail.html
- Amazon EventBridge User Guide: AWS service events delivered via CloudTrail - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail.html
- Amazon EventBridge User Guide: receiving read-only management events - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail-management.html
- Terraform AWS provider documentation: `aws_cloudtrail` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail

## Issues Found
- The post described multi-region trails as covering every AWS Region, including regions never used. AWS documents multi-region trails as applying to all AWS Regions enabled in the account. I changed the wording to "enabled regions" where needed.
- The IAM/global-services bullet implied only IAM global events are logged in `us-east-1`. AWS documents that most global service events are logged as occurring in US East (N. Virginia). I corrected the wording.
- The organization trail command said it must be run from the management account. AWS CloudTrail also supports creating organization trails from a CloudTrail delegated administrator account, so I updated the command comment.
- The organization trail setup did not mention the CLI/API prerequisite for trusted access in AWS Organizations. I added that requirement.
- The data-event selector comment said it enabled S3 data events for all buckets, but the selector only covered two S3 bucket prefixes and Lambda invocation events. I corrected the comment.
- The EventBridge rule did not include `detail-type` and did not set `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`, which is needed if the rule should also match read-only management events delivered via CloudTrail. I added both.
- The EventBridge section implied a single regional rule could catch all unauthorized-region activity. EventBridge receives CloudTrail events regionally on the default event bus, so I added guidance to create the rule in each monitored Region or forward events centrally.
- The Terraform comment said the snippet configured S3 and Lambda data events, but the shown advanced selector only configured S3 data events. I changed the comment to S3 only.
- The verification example used one `lookup-events` call and parsed `awsRegion` from returned events, which does not reliably verify event history across multiple Regions because CloudTrail event history lookup is regional. I replaced it with a loop over enabled Regions.

## Review Notes
- The AWS CLI could not be checked locally because `aws` is not installed in this workspace; CLI validation was performed against current AWS CLI command-reference documentation and AWS documentation examples.
- The Terraform snippet is illustrative and references resources not defined in the excerpt, such as the KMS key, CloudWatch log group, IAM role, bucket policy, and caller identity data source. That is acceptable for a focused blog snippet, but a complete production module would need those definitions and explicit dependency ordering for the CloudTrail S3 bucket policy.
