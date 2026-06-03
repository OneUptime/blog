# Validation Summary: How to Deploy Multi-Container Applications on ECS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- ECS task definitions
- Docker containers
- FireLens and AWS for Fluent Bit
- Amazon CloudWatch Logs
- AWS Cloud Map service discovery
- Application Load Balancer
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- ECS Service Connect
- AWS App Mesh

## Sources Consulted
- Amazon ECS task networking options for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS task definition differences for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Amazon ECS FireLens task definition examples: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/firelens-taskdef.html
- Amazon CloudWatch Logs FireLens setup for ECS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-logs.html
- Amazon ECS service discovery with AWS Cloud Map: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-discovery.html
- AWS CLI `ecs create-service` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS App Mesh documentation end-of-support notice: https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html
- Linked OneUptime ECS Service Connect post: https://oneuptime.com/blog/post/2026-02-12-ecs-service-connect-service-to-service-communication/view
- Linked OneUptime ECS with CloudFormation post: https://oneuptime.com/blog/post/2026-02-12-ecs-with-cloudformation/view
- Linked OneUptime ECS with AWS CDK post: https://oneuptime.com/blog/post/2026-02-12-ecs-with-aws-cdk/view

## Issues Found
- The FireLens examples used `Name: cloudwatch`. Updated both outputs to `Name: cloudwatch_logs` and added `auto_create_group: true`, matching current AWS CloudWatch Logs FireLens examples and making the snippets work when the log groups do not already exist.
- The shared-volume description referred to an "init container", which ECS does not provide as a first-class Kubernetes-style primitive. Changed this to "one-shot setup container" while preserving the intended ECS dependency pattern.
- The Cloud Map CLI example created a namespace but did not show the required Cloud Map service that supplies the `registryArn` used by `aws ecs create-service`. Added an `aws servicediscovery create-service` command with an A record and custom health check config.
- The load balancer section did not mention the Fargate/`awsvpc` target group requirement. Added the requirement that the ALB target group use target type `ip`, not `instance`.
- The inter-service communication list presented App Mesh as a normal new-design option. Added the AWS App Mesh end-of-support date, September 30, 2026, and redirected new ECS service-mesh deployments toward ECS Service Connect.

## Review Notes
The examples remain illustrative and still use placeholder ARNs, subnet IDs, security group IDs, namespace IDs, and image names. The task execution role and task role also need the usual permissions for pulling images, reading secrets or parameters, and writing or creating CloudWatch log groups. The linked OneUptime posts resolved successfully during review.
