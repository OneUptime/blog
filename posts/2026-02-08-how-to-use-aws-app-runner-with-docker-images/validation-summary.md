# Validation Summary: How to Use AWS App Runner with Docker Images

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS App Runner
- Amazon Elastic Container Registry (ECR)
- AWS CLI
- IAM roles and managed policies
- Docker
- Node.js
- Express
- GitHub Actions

## Sources Consulted
- AWS App Runner availability change: https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html
- AWS App Runner service based on a source image: https://docs.aws.amazon.com/apprunner/latest/dg/service-source-image.html
- AWS App Runner automatic scaling: https://docs.aws.amazon.com/apprunner/latest/dg/manage-autoscaling.html
- AWS CLI `apprunner create-service`: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-service.html
- AWS CLI `apprunner create-auto-scaling-configuration`: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-auto-scaling-configuration.html
- AWS CLI `apprunner update-service`: https://docs.aws.amazon.com/cli/latest/reference/apprunner/update-service.html
- AWS CLI `apprunner associate-custom-domain`: https://docs.aws.amazon.com/cli/latest/reference/apprunner/associate-custom-domain.html
- AWS App Runner IAM service roles: https://docs.aws.amazon.com/apprunner/latest/dg/security_iam_service-with-iam.html
- AWS managed policy `AWSAppRunnerServicePolicyForECRAccess`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSAppRunnerServicePolicyForECRAccess.html
- AWS App Runner pricing: https://aws.amazon.com/apprunner/pricing/
- Node.js release schedule: https://github.com/nodejs/Release
- npm `ci` command documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Docker Node official image: https://hub.docker.com/_/node

## Issues Found
- The post described App Runner as generally available for new deployments without noting the current availability change. AWS now states App Runner is no longer open to new customers, while existing customers can continue using it. Added a short note and scoped the workflow to existing App Runner customers.
- The post claimed App Runner scales from zero and has no idle charges when scaled to zero. Official App Runner auto scaling requires `min-size` to be at least 1, and pricing charges for provisioned memory while a running service is idle. Updated the scaling and cost language to describe minimum provisioned capacity and pause/resume controls.
- The auto scaling section said `min-size` could be set to 0. The AWS CLI reference lists the valid `--min-size` range as 1 to 25. Updated the explanation to state the minimum valid value is 1.
- The auto scaling command created a configuration but did not apply it to the service. Added the required `update-service --auto-scaling-configuration-arn` command using the created configuration ARN.
- The Dockerfile used `node:20-alpine`, but Node.js 20 reached end of life on April 30, 2026. Updated the example to `node:24-alpine`, which is an active LTS line.
- The Dockerfile used `npm ci --only=production`. Replaced it with the current `npm ci --omit=dev` form documented by npm.
- The post listed "automatic rollbacks" as an App Runner benefit. The verified documentation supports health checks for service monitoring, but not that general rollback claim. Reworded the bullet to health checks for monitoring service availability.

## Review Notes
The App Runner commands, ECR access role trust principal, managed ECR access policy ARN, health check fields, image repository configuration, custom domain association command, and GitHub Actions ECR push workflow are otherwise technically consistent with the official documentation reviewed. Existing customers can still use App Runner, but future revisions of this post may want to recommend ECS Express Mode for new AWS customers.
