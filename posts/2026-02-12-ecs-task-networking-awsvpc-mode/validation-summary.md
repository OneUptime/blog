# Validation Summary: How to Configure ECS Task Networking (awsvpc Mode)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EC2 launch type for ECS
- awsvpc task networking
- Elastic network interfaces
- Security groups
- VPC subnets and VPC endpoints
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- Amazon ECS task networking options for EC2: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking.html
- Allocate a network interface for an Amazon ECS task: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking-awsvpc.html
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Increasing Amazon ECS Linux container instance network interfaces: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-eni.html
- Amazon ECS interface VPC endpoints: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/vpc-endpoints.html
- Amazon ECR interface VPC endpoints: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- AWS CLI ecs put-account-setting-default command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/put-account-setting-default.html
- Terraform AWS provider aws_ecs_service resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider aws_vpc_endpoint resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint

## Issues Found
- The sample Fargate task definition used an ECR image and the awslogs log driver but omitted `executionRoleArn`. Added an ECS task execution role ARN because the task execution role is required for common Fargate tasks that pull images and publish logs.
- The post said there is no `hostPort` mapping in `awsvpc` mode. Clarified that `hostPort` is usually omitted and ECS sets it to the same value as `containerPort`.
- The ENI trunking explanation implied tasks are multiplexed on a single ENI and stated a `c5.large` goes from 3 tasks to about 10. Updated this to match ECS documentation: ECS attaches a managed trunk ENI, and a `c5.large` typically goes from 2 `awsvpc` tasks to 10 with trunking.
- The ENI trunking command block implied `ECS_ENABLE_TASK_ENI=true` is the per-instance trunking step. Replaced it with the correct caveat that newly launched supported container instances can register with increased ENI limits after the account setting is enabled.
- The public IP section described `assign_public_ip` as applying to all task ENIs. Clarified that this setting is for Fargate services; EC2 launch type task ENIs using `awsvpc` do not receive public IP addresses.
- The ECR VPC endpoint Terraform omitted settings commonly required for private ECR pulls: private DNS on interface endpoints, endpoint security groups, and route table association for the S3 gateway endpoint. Added `private_dns_enabled`, `security_group_ids`, and `route_table_ids`.

## Review Notes
The load balancer example references a target group but does not show its definition. For an ECS service using `awsvpc`, the target group should use `target_type = "ip"`. This is not incorrect in the shown `aws_ecs_service` block, but it would be useful context in a fuller Terraform example.
