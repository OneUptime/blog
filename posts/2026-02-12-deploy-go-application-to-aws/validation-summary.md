# Validation Summary: How to Deploy a Go Application to AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Docker
- Amazon ECS Fargate
- Amazon ECR
- Amazon CloudWatch Logs
- AWS Lambda
- Amazon EC2
- systemd
- GitHub Actions

## Sources Consulted
- Go release history and support policy: https://go.dev/doc/devel/release
- Go net/http package documentation: https://pkg.go.dev/net/http
- Docker scratch image documentation: https://hub.docker.com/_/scratch
- Docker golang official image tags: https://hub.docker.com/_/golang
- Docker CLI login documentation: https://docs.docker.com/reference/cli/docker/login/
- Amazon ECR CLI getting started guide: https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html
- Amazon ECS task CPU and memory documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
- Amazon ECS container health check documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS LogConfiguration API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html
- AWS CLI ECS create-service reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ecs/create-service.html
- AWS Lambda Go .zip package documentation: https://docs.aws.amazon.com/lambda/latest/dg/golang-package.html
- AWS Lambda execution environment lifecycle documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- AWS Lambda Go custom runtime migration guidance: https://aws.amazon.com/blogs/compute/migrating-aws-lambda-functions-from-the-go1-x-runtime-to-the-custom-runtime-on-amazon-linux-2/
- aws-actions/amazon-ecr-login documentation: https://github.com/aws-actions/amazon-ecr-login

## Issues Found
- The Go examples used Go 1.22, which is no longer a supported Go release as of June 3, 2026. Updated the Dockerfile and GitHub Actions workflow to Go 1.26, matching the current supported release family in the official Go and Docker image references.
- The ECS task definition health check ran `/server -health-check`, but the sample Go server did not implement that flag. Added a `-health-check` mode that checks `127.0.0.1:$PORT/health` and exits with the correct status for ECS container health checks.
- The ECS health check did not include startup grace time. Added `startPeriod` to avoid early failures while the application starts.
- The task definition configured the `awslogs` log driver but the service setup did not create the referenced CloudWatch Logs group. Added an `aws logs create-log-group` command before service creation.
- The Lambda section claimed Go cold starts are typically under 100ms and the summary called them near-zero. AWS documents that cold start latency depends on package size, initialization work, memory, architecture, and networking, so these absolute claims were softened.
- The EC2 user data script copied `/opt/go-app/go-app.service` into systemd without first placing that file on the instance. Changed it to download the service unit from S3 directly into `/etc/systemd/system/go-app.service`.
- The GitHub Actions workflow pushed only a SHA-tagged image, while the ECS task definition used the `latest` tag. Added a `latest` tag and push so `aws ecs update-service --force-new-deployment` deploys the image referenced by the task definition.
- The scratch image explanation said there was "no attack surface." Reworded this to "a much smaller OS-level attack surface" because the application binary still exposes attack surface.

## Review Notes
The AWS CLI was not installed in the workspace and Go was not installed, so local CLI help and Go compilation were not available. The review used official AWS, Go, Docker, and GitHub Actions documentation instead. For a future production-focused revision, the GitHub Actions workflow should prefer GitHub OIDC over long-lived AWS access key secrets, and the ECS deployment should register a new task definition revision with an immutable image tag instead of relying on `latest`.
