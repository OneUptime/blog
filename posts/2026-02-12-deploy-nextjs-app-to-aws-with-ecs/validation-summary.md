# Validation Summary: How to Deploy a Next.js App to AWS with ECS

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS ECS
- AWS Fargate
- Amazon ECR
- Application Load Balancer
- CloudWatch Logs and alarms
- Application Auto Scaling
- Next.js
- Docker
- GitHub Actions

## Sources Consulted
- Next.js output file tracing and standalone output documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Next.js production image optimization / sharp guidance: https://nextjs.org/docs/messages/sharp-missing-in-production
- Docker documentation for containerizing Next.js applications: https://docs.docker.com/guides/nextjs/containerize/
- Amazon ECS container health check documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- AWS CLI `ecs create-service` documentation: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI `ecs update-service` documentation: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ecs/update-service.html
- Amazon ECS Fargate CPU and memory documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
- Amazon ECS outbound networking documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/networking-outbound.html
- Amazon ECS `awslogs` logging documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html
- AWS ECS log configuration API documentation: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html
- AWS CLI `ecr create-repository` documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- AWS CLI `application-autoscaling register-scalable-target` documentation: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/register-scalable-target.html

## Issues Found
- The Dockerfile installed only production dependencies in the build dependency stage with `npm ci --only=production`. Next.js builds commonly require build-time packages from `devDependencies`, and the standalone build output already traces the files needed for the final runtime image. Changed it to `npm ci`.
- The ECS task definition configured the `awslogs` driver for `/ecs/nextjs-app`, but the setup commands did not create that CloudWatch log group. Added an `aws logs create-log-group` command before task definition registration.
- The GitHub Actions workflow pushed only the immutable `${{ github.sha }}` image tag, while the task definition image referenced `nextjs-app:latest`. Because `aws ecs update-service --force-new-deployment` reuses the tag configured in the task definition, the workflow could redeploy the old `latest` image. Added tagging and pushing of `latest` alongside the SHA tag.

## Review Notes
- The ALB and ECS health check snippets assume the application implements `/api/health`; that is technically valid, but readers should replace it with their own health endpoint.
- The networking CloudFormation is explicitly marked partial. A complete production template would also include private subnets, route tables, an internet gateway, a NAT gateway, security groups, and routes.
