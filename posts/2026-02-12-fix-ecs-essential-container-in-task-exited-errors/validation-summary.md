# Validation Summary: How to Fix ECS 'Essential Container in Task Exited' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- AWS CLI
- CloudWatch Logs
- Docker
- ECS task definitions
- ECS container health checks
- ECS deployment circuit breaker

## Sources Consulted
- Amazon ECS API Reference: ContainerDefinition - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html
- Amazon ECS Developer Guide: Task definition parameters - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS Developer Guide: Determine Amazon ECS task health using container health checks - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS Developer Guide: How the Amazon ECS deployment circuit breaker detects failures - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- Amazon ECS Developer Guide: Viewing Amazon ECS stopped task errors - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/stopped-task-errors.html
- AWS CLI Command Reference: ecs describe-tasks - https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-tasks.html
- AWS CLI Command Reference: logs get-log-events - https://docs.aws.amazon.com/cli/latest/reference/logs/get-log-events.html
- Docker CLI Reference: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Dockerfile Reference: ENTRYPOINT and CMD behavior - https://docs.docker.com/reference/builder/

## Issues Found
- The ECS `entryPoint` / `command` example used `entryPoint: ["/bin/sh", "-c"]` with `command: ["node", "server.js"]`. With `sh -c`, the command to execute must be passed as one shell command string; otherwise only `node` is treated as the command string and `server.js` becomes a positional parameter. Changed it to `command: ["node server.js"]`.
- The local Docker test command did not use the same entrypoint as the ECS task definition. Changed it to `docker run --rm --entrypoint /bin/sh my-app:latest -c "node server.js"` so it matches the corrected ECS shell entrypoint behavior.
- The health check explanation said `startPeriod` gives the container time before health checks begin failing. ECS still runs health checks during the start period; failed checks do not count toward the retry limit during that window. Updated the wording to match the official ECS health check behavior.

## Review Notes
- The AWS CLI was not installed in the local environment, so AWS CLI command syntax was verified against the official AWS CLI Command Reference rather than local `aws --help` output.
- The internal OneUptime links are plausible blog links but were not treated as authoritative technical sources.
