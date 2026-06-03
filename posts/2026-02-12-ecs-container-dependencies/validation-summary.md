# Validation Summary: How to Configure ECS Container Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- ECS task definitions
- ECS container dependencies
- ECS container health checks
- FireLens and AWS for Fluent Bit
- Terraform AWS provider
- Docker container stop signals

## Sources Consulted
- Amazon ECS API Reference: ContainerDependency - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDependency.html
- Amazon ECS Developer Guide: Amazon ECS task definition parameters for Fargate - https://docs.aws.amazon.com/AmazonECS/latest/userguide/task_definition_parameters.html/
- Amazon ECS Developer Guide: Amazon ECS task definition parameters for Amazon EC2 - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters_ec2.html
- Amazon ECS Developer Guide: Determine Amazon ECS task health using container health checks - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS Developer Guide: Amazon ECS task lifecycle - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-lifecycle-explanation.html
- Amazon ECS Developer Guide: Send Amazon ECS logs to an AWS service or AWS Partner - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html
- Fluent Bit Official Manual: Monitoring - https://docs.fluentbit.io/manual/administration/monitoring
- Fluent Bit Official Manual: Service section - https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/yaml/service-section
- Terraform Registry: aws_ecs_task_definition - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition

## Issues Found
- The Terraform FireLens example used a `HEALTHY` dependency on the log router while showing only the ECS FireLens configuration. Fluent Bit's `/api/v1/health` endpoint requires Fluent Bit's built-in HTTP server and health check settings to be enabled, so the example could fail as written. Changed the log router dependency to `START` and removed the unsupported health check from that example.
- The health check examples implied that the Fluent Bit `/api/v1/health` endpoint is available without extra configuration. Added a note that Fluent Bit requires the HTTP server and health check to be enabled.
- The FireLens common pattern did not mention that ECS configures a default dependency for FireLens containers. Added a note that explicit ordering overrides the default and should preserve the log-router-before-app order.
- The troubleshooting section said a dependency failure leaves the task stuck in `PROVISIONING`. ECS documentation describes dependency constraints as preventing dependent containers from progressing to their next state, while `PROVISIONING` is specifically for pre-launch resource provisioning such as ENI setup. Reworded the troubleshooting item to avoid naming the wrong lifecycle state.

## Review Notes
The core ECS dependency conditions, reverse shutdown ordering, `stopTimeout`, `essential: false` init-container pattern, and task definition field names were consistent with current AWS documentation. The AWS for Fluent Bit image uses a mutable `stable` tag in the example; this is acceptable for a tutorial, but production deployments should pin an immutable image tag.
