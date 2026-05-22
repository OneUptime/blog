# Validation Summary: How to Implement ECS Container Security with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AWS ECS
- AWS Fargate
- AWS IAM
- AWS ECR
- AWS Secrets Manager
- AWS KMS
- Amazon CloudWatch Logs and Container Insights
- AWS security groups

## Sources Consulted
- AWS ECS task definition differences for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- AWS ECS LinuxParameters API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LinuxParameters.html
- AWS ECS Tmpfs API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Tmpfs.html
- AWS ECS KernelCapabilities API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html
- AWS ECS tmpfs support announcement for Fargate: https://aws.amazon.com/about-aws/whats-new/2026/01/amazon-ecs-tmpfs-mounts-aws-fargate-managed-instances/
- AWS ECS Fargate security best practices: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-fargate.html
- AWS Security Blog container security considerations for ECS: https://aws.amazon.com/blogs/security/security-considerations-for-running-containers-on-amazon-ecs/
- AWS ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS ECS Secrets Manager environment variable documentation: https://docs.aws.amazon.com/AmazonECS/latest/userguide/secrets-envvar-secrets-manager.html
- AWS CloudWatch ECS Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-ECS.html
- Terraform AWS provider aws_ecs_cluster resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster.html
- Terraform AWS provider aws_ecs_task_definition resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider aws_ecr_repository resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform AWS provider aws_ecr_registry_scanning_configuration resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration

## Issues Found
- The Fargate task definition included `privileged = false`. The `privileged` container definition parameter is not valid for Fargate tasks, even when set to false, so it was removed.
- The task definition described `/tmp` as tmpfs but implemented it as a task volume and mount point. Updated the example to use the current ECS `linuxParameters.tmpfs` syntax with `containerPath`, `size`, and `mountOptions`.
- The commented capability example used `NET_BIND_SERVICE`, but Fargate only supports adding `SYS_PTRACE`. Updated the comment and example capability accordingly.
- The Secrets Manager comment said secrets were not environment variables. ECS `secrets` are injected as environment variables without plaintext values in the task definition, so the wording was corrected to "not plaintext environment values."
- The CloudWatch alarm used `GreaterThanThreshold` with `threshold = 0` for `RunningTaskCount`, which would alarm when tasks are running. Updated it to alarm when the running task count is below the desired count of 2 and to treat missing data as breaching.

## Review Notes
- The ECR repository-level `image_scanning_configuration` example remains valid in the Terraform AWS provider. For broader registry-wide enhanced scanning, Terraform also supports `aws_ecr_registry_scanning_configuration`.
- The IAM task-role trust policy uses `aws:SourceAccount`, which is valid confused-deputy mitigation. AWS also commonly recommends adding an `ArnLike`/`aws:SourceArn` condition where practical.
