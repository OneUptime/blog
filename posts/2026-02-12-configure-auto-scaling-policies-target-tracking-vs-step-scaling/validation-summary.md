# Validation Summary: How to Configure Auto Scaling Policies (Target Tracking vs Step Scaling)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2 Auto Scaling
- Auto Scaling groups
- Target tracking scaling policies
- Step scaling policies
- Predictive scaling
- Amazon CloudWatch alarms and metrics
- AWS CLI
- Application Load Balancer request count metrics
- Amazon SQS-backed worker scaling

## Sources Consulted
- AWS CLI Command Reference: autoscaling put-scaling-policy - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-scaling-policy.html
- AWS CLI Command Reference: autoscaling create-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Amazon EC2 Auto Scaling User Guide: Target tracking scaling policies - https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- Amazon EC2 Auto Scaling User Guide: Step and simple scaling policies - https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html
- Amazon EC2 Auto Scaling User Guide: Dynamic scaling and multiple policies - https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scale-based-on-demand.html
- Amazon EC2 Auto Scaling User Guide: Scaling policy based on Amazon SQS - https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html
- Amazon EC2 Auto Scaling User Guide: Predictive scaling policy creation - https://docs.aws.amazon.com/autoscaling/ec2/userguide/predictive-scaling-create-policy.html
- Amazon EC2 Auto Scaling User Guide: Scaling cooldowns - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scaling-cooldowns.html

## Issues Found
- The target tracking examples used `ScaleInCooldown` and `ScaleOutCooldown` inside `--target-tracking-configuration`. Those fields are for Application Auto Scaling target tracking, not EC2 Auto Scaling target tracking. EC2 Auto Scaling target tracking supports `--estimated-instance-warmup` for target tracking and step scaling policies, so the examples and explanation were updated to use instance warmup.
- The custom metric example used the raw SQS `ApproximateNumberOfMessagesVisible` metric as a target tracking metric. AWS documentation says raw queue depth is not appropriate for EC2 Auto Scaling target tracking because it is not proportional to the number of instances. The example now uses a custom `BacklogPerInstance` metric and explains that it should be published as queue backlog per worker.
- Monitoring and best-practice guidance referred to target tracking scale-in and scale-out cooldowns. This was updated to discuss one-minute metrics, instance warmup, and longer scale-in evaluation periods for step scaling.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the current official AWS CLI command reference and Amazon EC2 Auto Scaling documentation. The predictive scaling example uses valid fields, including `SchedulingBufferTime`, and the step scaling bounds are correctly expressed relative to the CloudWatch alarm threshold.
