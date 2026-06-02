# Validation Summary: How to Fix ECS Task Stuck in 'PENDING' State

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EC2 launch type for ECS
- `awsvpc` networking and ENIs
- AWS CLI
- Amazon ECR
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS IAM

## Sources Consulted
- Amazon ECS task lifecycle: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-lifecycle-explanation.html
- Amazon ECS service event messages: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-event-messages-list.html
- Amazon ECS task networking with `awsvpc`: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking-awsvpc.html
- Amazon ECS task definition parameters for EC2: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters_ec2.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECS Fargate capacity providers: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- AWS CLI ECS command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/
- AWS CLI EC2 command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/
- AWS CLI ECR command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/
- AWS CLI IAM command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/

## Issues Found
- The post described image pulling, ENI setup, and secret retrieval as actions ECS performs while a task is in `PENDING`. AWS documents ENI provisioning under `PROVISIONING` for `awsvpc` tasks and image pulls/container setup/networking setup under `ACTIVATING`. I changed the lifecycle explanation to say `PENDING` waits for the container agent and available resources, while later setup failures can still prevent the task from reaching `RUNNING`.
- The Fargate section used an EC2 container-instance placement event as the example Fargate capacity message. I replaced it with the AWS-documented Fargate-style capacity event: "Capacity is unavailable at this time. Please try again later or in a different availability zone."
- The post said invalid subnets/security groups and secret access failures leave tasks stuck in `PENDING`. These failures can prevent tasks from reaching `RUNNING`, but they are not accurately described as always being `PENDING` lifecycle failures. I changed those statements to "fail before it reaches RUNNING."
- The image pull section said tasks stay in `PENDING` while images are pulled. AWS documents image pulling in `ACTIVATING`, so I changed the wording to say the task has been placed but will not reach `RUNNING` until the pull completes.
- The Fargate Spot recommendation called Spot a fallback capacity provider. AWS describes Fargate Spot as spare capacity for interruption-tolerant workloads, and it is not an automatic on-demand fallback. I adjusted the wording to recommend it only for interruption-tolerant workloads.

## Review Notes
The AWS CLI examples use valid command names, common options, and JMESPath query syntax. The `memory` and `memoryReservation` explanation matches Amazon ECS task definition documentation for EC2 tasks. ENI trunking guidance is directionally correct, with the caveat already included in the post that supported instance types and newly launched/registered instances are required.
