# Validation Summary: How to Create CloudWatch Composite Alarms

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudWatch composite alarms
- Amazon CloudWatch metric alarms
- AWS CLI
- AWS CloudFormation
- Amazon ECS CloudWatch metrics
- Elastic Load Balancing / Application Load Balancer CloudWatch metrics
- Amazon SNS alarm actions

## Sources Consulted
- Amazon CloudWatch User Guide: Composite alarms - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- Amazon CloudWatch User Guide: Using Amazon CloudWatch alarms - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Alarms.html
- AWS CLI Command Reference: cloudwatch put-composite-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-composite-alarm.html
- Amazon CloudWatch API Reference: PutCompositeAlarm - https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutCompositeAlarm.html
- AWS CloudFormation Template Reference: AWS::CloudWatch::CompositeAlarm - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-compositealarm.html
- AWS CloudFormation Template Reference: AWS::CloudWatch::Alarm - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-alarm.html
- Elastic Load Balancing User Guide: CloudWatch metrics for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html

## Issues Found
- The post said a composite alarm transitions to ALARM, OK, or INSUFFICIENT_DATA based on the rule result. AWS documents that a composite alarm can be INSUFFICIENT_DATA only immediately after creation, before its first evaluation. Updated the explanation to say the rule result maps to ALARM or OK after initial evaluation.
- The rule syntax table omitted the currently documented AT_LEAST function. Added AT_LEAST with an example.
- The maintenance-mode section said the metric naturally returns to 0. Custom metrics do not automatically publish a zero value. Updated the text to say to publish 0 or let missing data be treated as not breaching after the evaluation period.
- The nesting section claimed a 5-level nesting limit. Official AWS documentation instead documents 100 underlying alarms per composite alarm, 150 composite alarms referencing a single alarm, and cycle detection. Replaced the unsupported limit with those documented constraints.
- The CloudFormation snippet referenced an undefined AlertTopic resource. Replaced the reference with the sample SNS ARN already used elsewhere in the post.

## Review Notes
The AWS CLI is not installed in the local workspace, so command validation was performed against official AWS CLI, API, CloudFormation, and service documentation instead of local CLI help output.
