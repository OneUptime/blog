# Validation Summary: How to Configure ECS Service Deployment Alarms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS service deployments
- Amazon CloudWatch metric alarms and composite alarms
- AWS CLI
- AWS CloudFormation
- AWS CDK v2
- Application Load Balancer CloudWatch metrics

## Sources Consulted
- Amazon ECS Developer Guide: How CloudWatch alarms detect Amazon ECS deployment failures - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-alarm-failure.html
- AWS CLI Command Reference: ecs update-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: cloudwatch put-composite-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-composite-alarm.html
- AWS CloudFormation Template Reference: AWS::ECS::Service DeploymentConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-deploymentconfiguration.html
- AWS CloudFormation Template Reference: AWS::ECS::Service DeploymentAlarms - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-deploymentalarms.html
- AWS CDK API Reference: aws_ecs.AlarmBehavior - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.AlarmBehavior.html
- AWS CDK API Reference: aws_elasticloadbalancingv2.ApplicationTargetGroup - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationTargetGroup.html
- Elastic Load Balancing User Guide: CloudWatch metrics for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html

## Issues Found
- The HTTP 5xx alarm was described as an error-rate alarm and its description said "exceeds 5%", but the command uses the `HTTPCode_Target_5XX_Count` metric with a static count threshold. Changed the heading, comment, and alarm description to describe a count-based alarm.
- The CDK snippet referenced `cdk.Duration` and `elbv2.HttpCodeTarget` without importing `aws-cdk-lib` or `aws-cdk-lib/aws-elasticloadbalancingv2`. Added the missing imports so the TypeScript example is syntactically complete.

## Review Notes
- The AWS CLI ECS deployment alarm structure, CloudFormation `DeploymentConfiguration.Alarms` fields, CloudWatch alarm options, composite alarm command, and CDK `deploymentAlarms` configuration match current AWS documentation.
- Amazon ECS documentation notes that deployment alarms are polled with CloudWatch `DescribeAlarms`, deployments can remain `IN_PROGRESS` through bake time, and alarms already in `ALARM` at deployment start are ignored for that deployment. These caveats are not required for the examples to be correct, but would be useful additions in a future deeper guide.
