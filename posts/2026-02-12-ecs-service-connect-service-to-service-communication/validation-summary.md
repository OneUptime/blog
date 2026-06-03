# Validation Summary: How to Configure ECS Service Connect for Service-to-Service Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- ECS Service Connect
- AWS Cloud Map
- AWS CLI
- AWS CloudWatch
- AWS Fargate
- JavaScript Fetch API

## Sources Consulted
- Amazon ECS Service Connect configuration overview: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts.html
- Use Service Connect to connect Amazon ECS services with short names: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html
- Amazon ECS Service Connect components: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts-deploy.html
- Configuring Amazon ECS Service Connect with the AWS CLI: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-connect.html
- Amazon ECS PortMapping API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html
- Amazon ECS TimeoutConfiguration API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_TimeoutConfiguration.html
- AWS CLI ecs create-service command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- Amazon ECS CloudWatch metrics: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html

## Issues Found
- The post stated that Service Connect uses HTTP namespaces, not DNS namespaces. AWS documentation says Service Connect can use any same-Region Cloud Map namespace in the account or shared via AWS RAM, while ECS-created default namespaces are HTTP namespaces and do not create Route 53 hosted zones. Updated the wording to reflect that distinction.
- The health-check section said the proxy automatically monitors backend health and removes unhealthy instances without configuration. AWS documents Service Connect outlier detection as passive health checking, and initial readiness routing depends on container health checks. Updated the section to describe passive outlier detection and the need for container health checks.
- The monitoring section used the wrong CloudWatch namespace, `AWS/ECS/ManagedScaling`. Service Connect metrics are published under `AWS/ECS`. Updated the text and CLI example.
- The CloudWatch metric example omitted the `DiscoveryName` dimension required for Service Connect `RequestCount` queries with service and cluster dimensions. Added `Name=DiscoveryName,Value=backend-api`.
- The metrics list included response time percentiles and generic error rates, which did not match the documented Service Connect metric names/statistics. Replaced those bullets with target response time and HTTP status code counts.
- The CloudWatch example used `date -v-1H`, which is a BSD/macOS date flag and will fail on common Linux environments. Changed it to GNU date syntax with `date -u -d '1 hour ago'`.
- The wrap-up described Service Connect health checking as automatic. Updated it to passive health checking to match the corrected technical explanation.

## Review Notes
The core Service Connect create-service examples, task-definition `portMappings.name`, `appProtocol` values, timeout field names, client-only service configuration, client alias usage, load balancing, retries, and link targets were otherwise consistent with the official AWS documentation reviewed.
