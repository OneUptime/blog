# Validation Summary: How to Configure ECS Container Dependency Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS task definitions
- ECS container dependencies
- ECS container health checks
- AWS CLI
- Docker health check command semantics
- Envoy readiness checks
- AWS FireLens and AWS for Fluent Bit

## Sources Consulted
- Amazon ECS Developer Guide: Task definition parameters for Amazon EC2, including container dependency conditions and health check fields: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters_ec2.html
- Amazon ECS Developer Guide: Determine Amazon ECS task health using container health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- AWS CLI Command Reference: `aws ecs register-task-definition`: https://docs.aws.amazon.com/cli/latest/reference/ecs/register-task-definition.html
- Amazon ECS API Reference: `LogConfiguration`: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html
- Amazon ECS Developer Guide: Send Amazon ECS logs to an AWS service or AWS Partner with FireLens: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html
- Amazon ECS Developer Guide: Example task definition to route logs to FireLens: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/firelens-taskdef.html
- Envoy documentation: Admin interface and `/ready` readiness endpoint: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Fluent Bit documentation: Monitoring and health endpoint behavior: https://docs.fluentbit.io/manual/administration/monitoring

## Issues Found
- The dependency condition table said `COMPLETE` means the dependency container exited with code 0 and that `SUCCESS` is the same as `COMPLETE`. AWS documents `COMPLETE` as waiting for the container to finish regardless of exit code, while `SUCCESS` additionally requires exit code 0. Updated the table accordingly.
- The init-container explanation did not mention that `COMPLETE` and `SUCCESS` dependencies cannot be set on essential containers. Added this to explain why `essential: false` is required for the migration container.
- The first Envoy health check used port `8001`, while the later Envoy sidecar example and Envoy's standard admin-interface examples use port `9901` for `/ready`. Updated the earlier health checks to use `localhost:9901/ready` for consistency with Envoy documentation and the post's own sidecar example.
- The logging-sidecar example used the Docker `fluentd` log driver with `localhost:24224`. ECS Fargate does not support the `fluentd` log driver, and current ECS guidance for Fluent Bit sidecar log routing is FireLens with the `awsfirelens` log driver. Updated the snippet to use `firelensConfiguration`, `awsfirelens`, and a `START` dependency on the Fluent Bit log router.
- The logging-sidecar text claimed the agent was healthy before the app started and that no logs would be lost. Since the corrected FireLens example uses startup ordering rather than a Fluent Bit health endpoint, revised the wording to say the log router has started and that this helps avoid startup log loss.
- The wrap-up recommended using health checks for init containers. ECS init-style containers should use `SUCCESS` or `COMPLETE` dependencies and be nonessential. Updated the sentence to distinguish long-running health-checked containers from nonessential init containers.

## Review Notes
- All JSON snippets in the post parse successfully after the edits.
- The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
- ECS container dependencies have platform and agent version requirements on older EC2/Fargate environments. The article focuses on current ECS usage and does not cover those legacy constraints.
