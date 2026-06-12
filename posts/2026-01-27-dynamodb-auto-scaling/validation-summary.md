# Validation Summary: How to Configure DynamoDB Auto Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- AWS Application Auto Scaling
- Amazon CloudWatch
- AWS CLI
- Terraform AWS provider
- AWS CDK for TypeScript
- Python boto3

## Sources Consulted
- AWS DynamoDB auto scaling documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.html
- AWS DynamoDB provisioned capacity mode documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html
- AWS DynamoDB on-demand capacity mode documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- AWS DynamoDB CloudWatch metrics and dimensions documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS CLI application-autoscaling put-scheduled-action command reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scheduled-action.html
- Application Auto Scaling scheduled scaling documentation: https://docs.aws.amazon.com/autoscaling/application/userguide/scheduled-scaling-using-cron-expressions.html
- Application Auto Scaling monitoring documentation: https://docs.aws.amazon.com/autoscaling/application/userguide/monitoring-cloudwatch.html
- Application Auto Scaling scaling activities documentation: https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-scaling-activities.html
- AWS CDK TableProps API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html
- AWS CDK PointInTimeRecoverySpecification API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.PointInTimeRecoverySpecification.html
- AWS CDK target tracking scaling props API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_applicationautoscaling.BasicTargetTrackingScalingPolicyProps.html
- Amazon DynamoDB pricing page: https://aws.amazon.com/dynamodb/pricing/
- Terraform AWS provider aws_appautoscaling_scheduled_action documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_scheduled_action

## Issues Found
- The AWS CDK example used `pointInTimeRecovery`, which is deprecated in current CDK v2. Updated it to `pointInTimeRecoverySpecification` with `pointInTimeRecoveryEnabled: true`.
- The high read utilization CloudWatch alarm compared `ConsumedReadCapacityUnits` directly to `80`, which is capacity units, not 80 percent utilization. Changed the alarm to use CloudWatch metric math: consumed capacity `Sum` divided by the metric period and provisioned capacity, multiplied by 100.
- The CloudWatch dashboard compared provisioned capacity to `ConsumedReadCapacityUnits` and `ConsumedWriteCapacityUnits` using `Average`, which is not the correct statistic for consumed throughput. Updated the widgets to use `Sum` and metric math to show consumed capacity units per second.
- The dashboard included an `AWS/ApplicationAutoScaling` `ScalingActivity` metric, which is not a documented CloudWatch metric for Application Auto Scaling scaling activities. Removed that widget; the post already shows the correct `describe-scaling-activities` command.
- The Python monitoring script assumed at least one scaling activity and would crash when there were no recent activities. Added an empty-list guard.
- The Python monitoring script requested `Average` for consumed capacity metrics. Updated it to request `Sum` for consumed capacity and `Average` for provisioned capacity.

## Review Notes
- AWS CLI examples, Application Auto Scaling resource IDs, scalable dimensions, scheduled action syntax, target tracking policy structure, capacity mode switching commands, and Terraform autoscaling resources were consistent with current official documentation.
- The static pricing example is accurate for the documented us-east-1 Standard table class pricing at review time, but DynamoDB prices are region-specific and should be rechecked before relying on the calculator for financial estimates.
