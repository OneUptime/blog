# Validation Summary: How to Set Up DNS Failover with Route 53

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53
- Route 53 health checks and failover routing
- AWS CDK v2 with TypeScript
- Amazon CloudWatch alarms and Route 53 metrics
- Amazon SNS notifications
- Amazon S3 static website hosting
- AWS CLI
- DNS TTL and resolver caching

## Sources Consulted
- AWS CloudFormation documentation for `AWS::Route53::HealthCheck` and `HealthCheckConfig`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-route53-healthcheck.html and https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-route53-healthcheck-healthcheckconfig.html
- Amazon Route 53 Developer Guide, health check behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- Amazon Route 53 Developer Guide, active-active and active-passive failover: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- Amazon Route 53 Developer Guide, alias vs non-alias records and TTL behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Amazon Route 53 Developer Guide, routing to S3 website buckets: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/RoutingToS3Bucket.html
- AWS General Reference, Amazon S3 website endpoints and Route 53 hosted zone IDs: https://docs.aws.amazon.com/general/latest/gr/s3.html
- Amazon Route 53 Developer Guide, CloudWatch metrics for health checks: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-cloudwatch.html
- AWS CLI v2 Route 53 command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/index.html
- AWS CDK v2 API reference for Route 53 health checks and CloudWatch SNS actions: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.CfnHealthCheck.html and https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch_actions-readme.html

## Issues Found
- The post said Route 53 supports three types of health checks. Current Route 53/CDK documentation includes endpoint, calculated, CloudWatch alarm, and Route 53 Application Recovery Controller routing-control health checks. Updated the list to four categories.
- The S3 failover example used a bucket name that did not match the DNS record name. AWS requires the S3 website bucket name to match the domain or subdomain being routed to it, so the example now uses `app.example.com`.
- The S3 failover example mixed a region-derived website endpoint with a hardcoded us-east-1 hosted zone ID. Updated the DNS name to the us-east-1 S3 website endpoint so it matches the hosted zone ID shown.
- The S3 failover section did not mention that S3 website endpoints are HTTP-only. Added the HTTPS caveat and the CloudFront recommendation.
- The TTL section said Route 53 alias records have a fixed 60-second TTL. AWS documents that alias records pointing to AWS resources use the target resource's default TTL and cannot have TTL set directly, so the wording was corrected.
- The monitoring example created an SNS topic and subscription but did not attach the topic to the CloudWatch alarm. Updated the example to retain the alarm in a variable and add an SNS alarm action.
- The summary advised keeping TTL values low without noting that alias-record TTLs cannot always be controlled. Updated it to say "where you can."

## Review Notes
The CDK snippets are illustrative and omit some surrounding imports and resource declarations such as ALBs, S3 deployment imports, SNS imports, and CloudWatch imports. The referenced APIs and property names are current for AWS CDK v2 and CloudFormation. For a production HTTPS failover page, CloudFront should be used in front of the S3 website content rather than aliasing directly to the S3 website endpoint.
