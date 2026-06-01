# Validation Summary: How to Use X-Ray with ECS Sidecar Container

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- AWS X-Ray daemon
- AWS X-Ray SDK for Node.js
- AWS IAM task roles and task execution roles
- AWS CLI
- CloudWatch Logs
- Docker container networking
- AWS Distro for OpenTelemetry

## Sources Consulted
- AWS X-Ray: Running the X-Ray daemon on Amazon ECS: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-ecs.html
- AWS X-Ray daemon download and Docker image guidance: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html
- AWS X-Ray SDK for Node.js documentation and maintenance notice: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs.html
- AWS X-Ray SDK for Node.js Express middleware documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-middleware.html
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS task networking with awsvpc mode: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking-awsvpc.html
- Amazon ECS service scheduling strategies: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_service-options.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS managed policy AWSXRayDaemonWriteAccess: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSXRayDaemonWriteAccess.html
- AWS CLI get-trace-summaries reference: https://docs.aws.amazon.com/cli/latest/reference/xray/get-trace-summaries.html
- AWS Distro for OpenTelemetry X-Ray exporter guidance: https://aws-otel.github.io/docs/getting-started/x-ray

## Issues Found
- The introduction implied that ECS generally cannot use a host-installed daemon. This is only true for Fargate; ECS on EC2 can also use a per-host daemon or daemon service. Updated the wording to scope the limitation to Fargate.
- The sidecar networking explanation said bridge-mode containers can communicate over `localhost` with links. In bridge mode, each container has its own loopback interface; links or container names are used instead. Updated the explanation.
- The prerequisites listed OpenTelemetry as if it sends directly to the X-Ray daemon. OpenTelemetry typically uses the ADOT Collector and X-Ray exporter, not the X-Ray daemon sidecar. Updated the prerequisite to distinguish X-Ray SDK instrumentation from new OpenTelemetry instrumentation.
- The task definition examples used `amazon/aws-xray-daemon:latest`. AWS documentation recommends the released `3.x` daemon image, including the public ECR image. Updated both examples to `public.ecr.aws/xray/aws-xray-daemon:3.x`.
- The JSON task definition examples contained `//` comments even though the post registers the file with `aws ecs register-task-definition --cli-input-json`. JSON files passed to the AWS CLI must be valid JSON. Removed the comments and verified both JSON snippets parse successfully.
- The troubleshooting section suggested checking security group rules for `localhost:2000` traffic in `awsvpc` mode. Traffic over localhost stays inside the task and is not controlled by the task security group. Updated the note to focus on daemon health and address configuration.
- The conclusion described the official daemon image as actively maintained and optimized. AWS X-Ray SDKs and daemon entered maintenance mode on February 25, 2026. Updated the conclusion and introduction with the current maintenance-mode caveat.

## Review Notes
- The AWS CLI command shapes, IAM trust policy, managed policy ARN, ECS `taskRoleArn` / `executionRoleArn` usage, CloudWatch Logs configuration fields, Fargate `awsvpc` mode, daemon scheduling strategy for EC2 services, and Node.js X-Ray Express middleware pattern were consistent with official documentation.
- The Node.js example uses the AWS SDK for JavaScript v2 package (`aws-sdk`). That remains compatible with the X-Ray SDK example pattern, but new applications should evaluate AWS SDK v3 and OpenTelemetry-based instrumentation because X-Ray SDKs are now in maintenance mode.
