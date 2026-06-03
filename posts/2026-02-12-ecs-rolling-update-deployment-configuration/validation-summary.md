# Validation Summary: How to Use ECS Rolling Update Deployment Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- ECS rolling deployments
- AWS CLI
- AWS CloudFormation
- AWS CDK
- CloudWatch metrics
- Application Load Balancer health checks

## Sources Consulted
- Amazon ECS Developer Guide: Deploy Amazon ECS services by replacing tasks - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html
- Amazon ECS Developer Guide: Update Amazon ECS service parameters - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service-parameters.html
- Amazon ECS API Reference: DeploymentConfiguration - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentConfiguration.html
- AWS CLI Command Reference: ecs create-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CloudFormation Template Reference: AWS::ECS::Service DeploymentConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-deploymentconfiguration.html
- AWS CDK API Reference: FargateServiceProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.FargateServiceProps.html
- Amazon ECS Developer Guide: Amazon ECS CloudWatch metrics - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Amazon ECS Developer Guide: Amazon ECS service utilization metrics - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_utilization.html
- Amazon CloudWatch User Guide: Amazon ECS Container Insights metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html

## Issues Found
- The `maximumPercent` explanation described only running tasks. Updated it to include `RUNNING` or `PENDING` tasks, matching the ECS API and CloudFormation documentation.
- The fast deployment example used `maximumPercent: 300` and said ECS could run up to 12 tasks for a desired count of 4. For a normal rolling replacement with desired count 4, `maximumPercent: 200` already allows all 4 new tasks to start before the 4 old tasks stop, and ECS does not need 12 total tasks. Changed the example and decision table to `maximumPercent: 200` and corrected the total to 8.
- The health check grace period description said ECS waits before starting health checks. Updated it to say ECS ignores unhealthy Elastic Load Balancing, VPC Lattice, and container health checks for the configured period after task start, matching the AWS CLI documentation.
- The monitoring section listed `RunningTaskCount` without noting that it is a Container Insights metric. Added that caveat.

## Review Notes
The AWS CLI, CloudFormation, and CDK property names in the examples are current and syntactically plausible. The post focuses on replica services using ECS rolling deployments; defaults differ for daemon scheduling and some CDK construct defaults, but those cases are outside the examples shown.
