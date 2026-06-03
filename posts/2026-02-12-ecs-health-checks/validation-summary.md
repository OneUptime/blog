# Validation Summary: How to Configure ECS Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon Application Load Balancer
- Elastic Load Balancing target groups
- AWS CLI
- Express / Node.js
- Flask / Python

## Sources Consulted
- Amazon ECS: Determine task health using container health checks - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS: Optimize load balancer health check parameters - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-healthcheck.html
- Amazon ECS task definition health check parameters - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Elastic Load Balancing: Health checks for Application Load Balancer target groups - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS CLI: ecs create-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI: ecs update-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CLI: elbv2 modify-target-group - https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group.html
- Express 4.x API reference - https://expressjs.com/en/4x/api.html
- Flask API documentation - https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- The post said ECS replaces a container when it becomes unhealthy. ECS service replacement operates at the task level, and ECS task health only considers essential containers with health checks. Changed this to "When an essential container becomes unhealthy, ECS replaces the task."
- The `startPeriod` explanation omitted the AWS-documented nuance that a successful check during the start period marks the container healthy and subsequent failures count normally. Added that clarification.
- One code block was labeled `json` even though it included comments. Changed it to `jsonc` so the syntax label matches the snippet.
- The post said ECS service health requires both container and ALB checks without specifying the conditions. Clarified that this applies when a service uses a load balancer and an essential container has a health check defined.
- The service-level grace period section said ECS ignores only ALB health check failures. AWS documents `healthCheckGracePeriodSeconds` as ignoring unhealthy Elastic Load Balancing, VPC Lattice, and container health check status. Updated the wording.
- The restart-loop section blamed only the service health check grace period. Added container health check `startPeriod` as another common startup-loop cause.
- The slow deployment section incorrectly said the ALB needs the healthy threshold count before a newly registered target receives traffic. AWS documents that newly registered targets need only one successful health check; the healthy threshold applies when an unhealthy target recovers. Updated the timing examples accordingly.

## Review Notes
- The AWS CLI commands use valid command names and option names, but several examples contain placeholder JSON or placeholder ARNs and must be filled in before running.
- The health check examples assume tools such as `curl` and application dependencies are present in the container image/runtime.
