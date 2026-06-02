# Validation Summary: How to Set Up ECS Cluster Auto Scaling with EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- Amazon EC2
- EC2 Auto Scaling groups
- ECS capacity providers
- Application Auto Scaling
- AWS CLI
- CloudWatch metrics and Container Insights
- Amazon SQS queue-based scaling

## Sources Consulted
- Amazon ECS cluster auto scaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-auto-scaling.html
- Amazon ECS capacity providers for EC2 workloads: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html
- Amazon ECS managed scaling behavior: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-scaling-behavior.html
- Amazon ECS task scheduling and capacity provider strategies: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduling_tasks.html
- AWS CLI `ecs create-capacity-provider`: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-capacity-provider.html
- AWS CLI `ecs create-service`: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI `ec2 create-launch-template`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- AWS CLI `application-autoscaling put-scaling-policy`: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scaling-policy.html
- Application Auto Scaling target tracking behavior: https://docs.aws.amazon.com/autoscaling/application/userguide/target-tracking-scaling-policy-overview.html
- ECS container metadata configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/enable-metadata.html
- ECS Spot Instance draining: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/spot-instance-draining-linux-container.html

## Issues Found
- The launch template user-data command used plain `base64`, which can emit wrapped output on common Linux systems. Wrapped base64 inside the inline JSON string can make the AWS CLI JSON invalid, so I changed it to remove newlines with `tr -d '\n'`.
- The ECS service examples used task definitions named `web-api:latest` and `worker:latest`. ECS task definition references support a family name, `family:revision` with a numeric revision, or a full ARN; omitting the revision uses the latest active revision. I changed them to `web-api` and `worker`.
- The ECS service placement strategy listed `spread` before `binpack` while the capacity provider target capacity was set to 80%. AWS ECS documentation says that when target capacity is less than 100%, `binpack` must have higher order than `spread`, so I reordered the placement strategies.
- The worker queue scaling policy used the raw SQS `ApproximateNumberOfMessagesVisible` metric as a target tracking metric. Application Auto Scaling target tracking requires a metric that behaves like utilization and changes proportionally with scalable capacity. I changed the example to use a custom `BacklogPerTask` metric so the target value represents queue backlog per running task.

## Review Notes
The AWS CLI is not installed in this local environment, so command validation was performed against current official AWS CLI and Amazon ECS documentation rather than local `aws --help` output. The linked OneUptime placement-strategy article URL is plausible and relevant to the topic.
