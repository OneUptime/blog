# Validation Summary: How to Troubleshoot ECS Task Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon ECR
- AWS IAM
- AWS CLI
- Amazon CloudWatch Logs
- Amazon VPC networking
- Docker container exit codes

## Sources Consulted
- Amazon ECS stopped tasks error messages: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/stopped-task-error-codes.html
- AWS CLI `ecs list-tasks` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/list-tasks.html
- AWS CLI `ecs describe-tasks` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-tasks.html
- Amazon ECS task definitions: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html
- Amazon ECS `ContainerDefinition` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html
- Amazon ECS task lifecycle: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-lifecycle-explanation.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Using Amazon ECR images with Amazon ECS: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_ECS.html
- Amazon ECR interface VPC endpoints: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Amazon ECS `RepositoryCredentials` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_RepositoryCredentials.html
- Amazon ECS container health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html

## Issues Found
- The post said any container with a non-zero exit code stops the task. ECS stops the task when an essential container fails or stops, and containers are essential by default. Updated the wording to refer to essential containers.
- The exit code table said exit code 0 should not cause restarts. ECS services replace stopped tasks to maintain desired count, even if an essential container exits successfully. Updated the table entry.
- The post treated exit code 137 as always OOM. Exit 137 means SIGKILL; OOM is common, but forced termination after a stop timeout is another possible cause. Updated the table and explanation.
- The ECR permissions section stated only the ECS task execution role needs ECR pull permissions. AWS documentation distinguishes Fargate/task execution role-based pulls from EC2 tasks that rely on the container instance role. Updated the role guidance.
- The "Resource Constraint Failures" line was missing its Markdown heading marker, making the section malformed. Restored it as an H2.
- The subnet route table command only checks explicit subnet route table associations. Added a note that subnets can instead use the VPC main route table.
- The checklist said non-zero exit codes mean the app crashed. Updated it to account for essential container exits more accurately.

## Review Notes
The AWS CLI command shapes and JMESPath queries are structurally valid, but the local environment does not have the AWS CLI installed, so command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
