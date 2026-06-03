# Validation Summary: How to Deploy a Docker App with Elastic Beanstalk

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Elastic Beanstalk
- Elastic Beanstalk Docker platform
- Docker and Docker Compose
- Amazon ECR
- AWS CLI
- EB CLI
- Node.js and Express
- CloudWatch Logs
- Elastic Beanstalk `.ebextensions`

## Sources Consulted
- AWS Elastic Beanstalk: Preparing your Docker image for deployment to Elastic Beanstalk - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/single-container-docker-configuration.html
- AWS Elastic Beanstalk: Configuring Elastic Beanstalk Docker environments - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker.container.console.html
- AWS Elastic Beanstalk: General options for all environments - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
- AWS Elastic Beanstalk: Reverse proxy configuration - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.proxy.html
- AWS Elastic Beanstalk: Deployment policies and settings - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html
- AWS Elastic Beanstalk EB CLI: eb init - https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-init.html
- AWS CLI: Amazon ECR examples using AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli_ecr_code_examples.html
- Docker Docs: Compose file reference - https://docs.docker.com/compose/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- Replaced `npm ci --only=production` with `npm ci --omit=dev` to use the current npm form for omitting development dependencies.
- Corrected the Elastic Beanstalk port explanation. Current AWS documentation describes the proxy forwarding to the configured application/container port and says `PORT` is only available when the environment property is set, not that it always defaults to 8080.
- Changed ECR repository examples from a 9-digit account ID placeholder to a valid 12-digit AWS account ID placeholder.
- Removed the obsolete top-level `version: '3.8'` field from the Docker Compose example.
- Added `PORT: 8080` to the environment configuration example so the earlier Node.js `process.env.PORT || 8080` pattern is tied to an explicit Elastic Beanstalk environment property.
- Added a Docker Compose caveat explaining that Elastic Beanstalk does not provide the Nginx proxy for Compose environments and ignores the `ProxyServer` setting there.
- Corrected the persistent storage wording. The original `.ebextensions` example created a host directory but did not mount or provision an EBS volume.
- Merged duplicate `aws:elasticbeanstalk:command` keys in the rolling deployment YAML; duplicate YAML keys can cause earlier settings to be overwritten.
- Replaced an old-style awslogs-agent file configuration with the current Elastic Beanstalk CloudWatch Logs option settings.

## Review Notes
The post is technically relevant and remains accurate after the fixes. The Docker Compose example still publishes Redis on the host for simplicity, but in production this port should usually be kept internal unless there is a specific operational reason to expose it.
