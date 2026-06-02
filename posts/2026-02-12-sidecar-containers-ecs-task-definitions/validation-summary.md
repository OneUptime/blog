# Validation Summary: How to Run Sidecar Containers in ECS Task Definitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- ECS task definitions
- Docker containers
- AWS FireLens
- Fluent Bit
- Amazon CloudWatch Logs
- AWS App Mesh
- Envoy
- AWS Systems Manager Parameter Store

## Sources Consulted
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS FireLens task definition example: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/firelens-taskdef.html
- Amazon ECS FireLens considerations: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html
- CloudWatch Logs FireLens setup example: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-ECS-logs.html
- Amazon ECS task networking for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
- Amazon ECS awsvpc task networking: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking-awsvpc.html
- AWS App Mesh getting started with Amazon ECS: https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-ecs.html
- AWS App Mesh end-of-support notice: https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html
- AWS CloudWatch Logs Fluent Bit plugin reference: https://github.com/aws/amazon-cloudwatch-logs-for-fluent-bit

## Issues Found
- The FireLens CloudWatch output used `"Name": "cloudwatch"`, which refers to the older CloudWatch Logs plugin. Updated it to `"cloudwatch_logs"` to match AWS's current FireLens CloudWatch Logs example.
- The FireLens example used `log_stream_prefix`, which the AWS CloudWatch Logs Fluent Bit plugin marks as deprecated. Replaced it with `log_stream_name` using the ECS task ID metadata variable.
- The description of the ECS `COMPLETE` dependency condition incorrectly said it exits with code 0. Updated it to clarify that `COMPLETE` only requires the dependency container to finish, while `SUCCESS` requires exit code 0.
- The App Mesh Envoy example used an older Envoy image tag and did not mention AWS App Mesh end of support. Updated the image to the current documented tag and added the September 30, 2026 end-of-support caveat.
- The 1024 MB task resource allocation example assigned hard container memory limits totaling 1152 MB. Reduced the main application hard limit so the example fits within the task memory.
- The sidecar memory guidance implied soft limits alone were enough for sidecars. Updated it to recommend soft limits together with hard limits, consistent with the surrounding warning about sidecars starving the main application.

## Review Notes
The examples are illustrative and still omit deployment-specific details such as IAM permissions, CloudWatch log group creation, and App Mesh proxy configuration. The ECS task definition field names and dependency semantics are otherwise consistent with current AWS documentation.
