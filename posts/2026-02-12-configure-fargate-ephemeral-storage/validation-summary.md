# Validation Summary: How to Configure Fargate Ephemeral Storage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Fargate
- Amazon ECS task definitions
- ECS bind mount volumes
- AWS CloudFormation
- AWS CDK
- Amazon CloudWatch and Container Insights
- Amazon EFS
- AWS CLI
- Python boto3

## Sources Consulted
- Amazon ECS Developer Guide: Fargate task ephemeral storage for Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-storage.html
- Amazon ECS API Reference: EphemeralStorage: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_EphemeralStorage.html
- AWS CloudFormation Template Reference: AWS::ECS::TaskDefinition EphemeralStorage: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-taskdefinition-ephemeralstorage.html
- AWS CLI Command Reference: ecs register-task-definition: https://docs.aws.amazon.com/cli/latest/reference/ecs/register-task-definition.html
- AWS CDK API Reference: aws-cdk-lib.aws_ecs module: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
- Amazon CloudWatch User Guide: ECS Container Insights enhanced observability metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-enhanced-observability-metrics-ECS.html
- Amazon ECS Developer Guide: Amazon ECS task definition differences for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- AWS Fargate Pricing: https://aws.amazon.com/fargate/pricing/
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The post stated broadly that every Fargate task gets 20 GB of ephemeral storage. Updated the wording to specify current ECS Fargate platform versions and use GiB where the ECS task definition/API uses GiB.
- The post implied ECS always restarts a failed task after storage exhaustion. Clarified that automatic replacement applies when the task is part of an ECS service.
- The post described image layers as only read-only Docker image layers and described all non-EFS volumes as part of ephemeral storage. Updated this to match AWS wording: pulled compressed and uncompressed image artifacts, writable layers, and bind mount volumes consume task ephemeral storage.
- The sharing example called the task volume a Docker volume. Updated the wording to "ECS bind mount volume," which matches ECS task definition terminology.
- The monitoring section said ephemeral storage usage is not directly available as a CloudWatch metric. Updated it to note that Container Insights publishes ephemeral storage reserved and utilized metrics for eligible Fargate Linux tasks, while custom metrics remain useful when Container Insights is not enabled or application-specific dimensions are needed.
- The cost section described pricing as simply per GB per hour of task runtime and said a task "uses" 100 GB. Updated it to distinguish configured additional storage from actual usage and avoid implying a fixed pricing unit beyond the current Fargate pricing page.
- The EFS comparison claimed ephemeral storage is cheaper per GB. Reworded this to avoid a broad pricing claim and focus on avoiding persistent storage costs for short-lived scratch data.

## Review Notes
The AWS CLI was not installed locally, so CLI command validation was performed against the official AWS CLI command reference. JSON task definition snippets and the Python custom metric snippet were checked locally for syntax.
