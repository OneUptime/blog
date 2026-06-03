# Validation Summary: How to Set Up CloudWatch Container Insights for ECS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- Amazon CloudWatch
- CloudWatch Container Insights with enhanced observability
- AWS CLI
- AWS IAM
- AWS CloudFormation
- CloudWatch Logs Insights
- CloudWatch agent
- AWS Fargate and ECS on EC2

## Sources Consulted
- AWS CloudWatch documentation: Setting up Container Insights on Amazon ECS - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-cluster.html
- AWS CloudWatch documentation: Amazon ECS Container Insights metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- AWS CloudWatch documentation: Amazon ECS Container Insights with enhanced observability metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-enhanced-observability-metrics-ECS.html
- AWS CloudWatch documentation: Deploying the CloudWatch agent to collect EC2 instance-level metrics on Amazon ECS - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-instancelevel.html
- Amazon ECS documentation: Monitor Amazon ECS containers using Container Insights with enhanced observability - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-container-insights.html
- Amazon ECS documentation: Amazon ECS cluster reservation metrics - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster_reservation.html
- AWS announcement: Amazon CloudWatch Container Insights launches enhanced observability for Amazon ECS - https://aws.amazon.com/about-aws/whats-new/2024/12/amazon-cloudwatch-container-insights-observability-ecs/
- AWS CloudWatch pricing - https://aws.amazon.com/cloudwatch/pricing/
- AWS sample CloudWatch agent ECS daemon task definition - https://github.com/aws-samples/amazon-cloudwatch-container-insights

## Issues Found
- The post described container-level visibility but used `containerInsights=enabled`. Updated cluster, existing cluster, account default, and CloudFormation examples to use `containerInsights=enhanced`, which is the setting AWS documents for ECS enhanced observability down to container level.
- The post said EC2 launch type requires the CloudWatch agent. Clarified that enhanced Container Insights on the cluster provides cluster, service, task, and container metrics, while the CloudWatch agent daemon service is for EC2 instance-level metrics.
- The Fargate section implied task execution role permissions were required for Container Insights. Replaced this with the narrower and accurate note that CloudWatch Logs permissions are needed only when application containers use the `awslogs` log driver.
- JSON examples included `//` comments, which made them invalid JSON. Removed those comments.
- The CloudWatch agent task definition used an outdated/generic image name and was missing mounts used by AWS's ECS daemon-service template. Updated the image, `USE_DEFAULT_CONFIG` value, log group, cgroup mounts, CPU, and memory values to match the AWS sample pattern.
- The daemon service creation command included `--launch-type EC2`. Removed it to match AWS's current daemon-service example for the CloudWatch agent.
- The CloudFormation snippet still used `containerInsights: enabled` and lacked the CloudWatch agent mounts, volumes, log configuration, CPU, and memory settings needed for the daemon task. Updated the snippet accordingly.
- The CPU alarm described an 80% threshold but used `CpuUtilized`, which is CPU units. Changed the metric to `TaskCpuUtilization`, which is a percentage metric available with enhanced observability.
- The standard ECS metrics explanation overstated service-level reservation metrics. Corrected it to distinguish cluster and service utilization from cluster-level reservation metrics.
- The cost estimate of `$15-30/month` for 50 tasks was inconsistent with AWS's current pricing example for ECS enhanced observability. Replaced it with the AWS pricing-page example and a note that costs vary by Region and metric/log volume.

## Review Notes
The post now focuses on Container Insights with enhanced observability because that is the current AWS feature that supports the post's container-level monitoring claims. The CloudWatch agent section is retained only for EC2 instance-level metrics.
