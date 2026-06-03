# Validation Summary: How to Set Up ECS Service Auto Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS Service Auto Scaling
- AWS Application Auto Scaling
- AWS CLI
- Amazon CloudWatch alarms and metrics
- Application Load Balancer target tracking metrics
- AWS Fargate Spot

## Sources Consulted
- Amazon ECS Developer Guide: Automatically scale your Amazon ECS service: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html
- AWS CLI Command Reference: application-autoscaling put-scaling-policy: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scaling-policy.html
- Application Auto Scaling User Guide: Create a step scaling policy using the AWS CLI: https://docs.aws.amazon.com/autoscaling/application/userguide/create-step-scaling-policy-cli.html
- Application Auto Scaling User Guide: Target tracking scaling policy overview: https://docs.aws.amazon.com/autoscaling/application/userguide/target-tracking-scaling-policy-overview.html
- Application Auto Scaling User Guide: Create scheduled actions using the AWS CLI: https://docs.aws.amazon.com/autoscaling/application/userguide/create-scheduled-actions.html
- AWS CLI Command Reference: application-autoscaling put-scheduled-action: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scheduled-action.html
- AWS Auto Scaling API Reference: PredefinedScalingMetricSpecification: https://docs.aws.amazon.com/autoscaling/plans/APIReference/API_PredefinedScalingMetricSpecification.html
- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/

## Issues Found
- The post said ECS Application Auto Scaling supports three scaling approaches. AWS currently documents target tracking, step scaling, scheduled scaling, and predictive scaling for ECS services. Changed the wording to say the guide covers three common approaches rather than all supported approaches.
- The health check prerequisite implied scaling decisions are based on healthy tasks. ECS service scaling uses CloudWatch metrics and scaling policies; health checks help replacement tasks come online reliably. Updated the wording.
- The custom metric example used the raw SQS `ApproximateNumberOfMessagesVisible` metric while describing queue depth per task. Target tracking custom metrics should be utilization-style metrics that change in proportion to capacity. Replaced the example with a custom `QueueMessagesPerTask` metric.
- The step scaling examples created CloudWatch alarms before creating the scaling policies and did not include `--alarm-actions`, so the alarms would not invoke the policies. Reordered the examples and added `--alarm-actions` using the returned policy ARN.
- The scheduled scaling example used `US/Eastern` and described the schedule as EST. AWS documents canonical IANA time zone names for scheduled actions. Changed the timezone to `America/New_York` and the text to Eastern Time.
- The multiple-policy explanation incorrectly described scale-in precedence. Updated it to match Application Auto Scaling behavior: the largest calculated capacity wins, and multiple target tracking policies scale in only when all scale-in-enabled policies are ready to scale in.
- The production setup comment said the highest desired count wins across all three listed mechanisms. Updated it to distinguish dynamic policy capacity calculations from scheduled actions that adjust min/max bounds.
- The Fargate Spot cost tip said it is 70% cheaper. AWS describes Fargate Spot pricing as up to a 70% discount. Updated the wording.

## Review Notes
The AWS CLI was not installed in the local environment, so command syntax and option availability were checked against the current official AWS CLI and AWS service documentation rather than local `aws --help` output.
