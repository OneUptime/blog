# Validation Summary: How to Use Weighted Target Groups with ALB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Application Load Balancer
- Elastic Load Balancing v2 target groups and listener rules
- AWS CLI
- Amazon CloudWatch metrics
- Python
- Boto3

## Sources Consulted
- AWS Elastic Load Balancing documentation: Action types for listener rules - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html
- AWS Elastic Load Balancing documentation: CloudWatch metrics for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS CLI Command Reference: elbv2 create-target-group - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI Command Reference: elbv2 create-rule - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-rule.html
- AWS CloudFormation documentation: TargetGroupStickinessConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-elasticloadbalancingv2-listener-targetgroupstickinessconfig.html
- Boto3 CloudWatch documentation: get_metric_statistics - https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html

## Issues Found
- The Python CloudWatch example passed Unix timestamp floats to `StartTime` and `EndTime`. Boto3 documents these parameters as `datetime` values, so the example now uses timezone-aware UTC `datetime` values.
- The Python helper was named `get_error_rate` but returned a 5xx error count. It is now named `get_error_count`, and the docstring matches the returned metric.
- The automated canary example omitted `TargetGroupStickinessConfig` even though the post recommends stickiness for weighted target groups. The Python `modify_listener` calls now include the same stickiness configuration used in the CLI examples.
- The health-check note said ALB would not route traffic to an unhealthy new version regardless of weight. AWS documents that a weighted target group that is empty or has only unhealthy targets does not cause automatic failover to another healthy weighted target group, so the note was corrected.

## Review Notes
The AWS CLI examples use placeholder ARNs, VPC IDs, target group names, and instance IDs, so they must be replaced with real environment-specific values before execution. The command structures, ELBv2 `ForwardConfig` fields, target group weights, stickiness settings, rule conditions, and CloudWatch metric dimensions were otherwise consistent with current AWS documentation.
