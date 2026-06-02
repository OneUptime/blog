# Validation Summary: How to Troubleshoot Elastic Beanstalk Deployment Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS Elastic Beanstalk
- EB CLI
- AWS CLI
- IAM instance profiles and policies
- Elastic Load Balancing health checks
- Elastic Beanstalk `.ebextensions`
- Elastic Beanstalk platform hooks
- Docker and Amazon ECR
- Python application startup configuration

## Sources Consulted
- AWS Elastic Beanstalk Developer Guide: EB CLI `eb logs` command, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-logs.html
- AWS Elastic Beanstalk Developer Guide: Viewing logs from EC2 instances, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.logging.html
- AWS Elastic Beanstalk Developer Guide: General option settings, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
- AWS Elastic Beanstalk Developer Guide: Reverse proxy configuration and `PORT`, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.proxy.html
- AWS Elastic Beanstalk Developer Guide: Platform hooks, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.hooks.html
- AWS Elastic Beanstalk Developer Guide: Authenticating with image repositories and ECR, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/docker-configuration.remote-repo.html
- AWS Elastic Beanstalk Developer Guide: Deployment policies, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.deploy-existing-version.html
- AWS CLI Command Reference: `describe-configuration-settings`, https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/describe-configuration-settings.html
- AWS CLI Command Reference: `describe-environment-resources`, https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/describe-environment-resources.html
- AWS Elastic Beanstalk Developer Guide: EB CLI `eb config`, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-config.html
- AWS Elastic Beanstalk Developer Guide: EB CLI `eb create`, https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-create.html

## Issues Found
- Corrected `eb logs --all` wording. AWS documents `--all` as saving complete logs under `.elasticbeanstalk/logs`; `--zip` is the option that compresses the logs into a zip file.
- Replaced the unsupported `/var/log/eb-hooks/` log reference with the documented AL1 deployment log, `/var/log/eb-activity.log`, and kept `/var/log/eb-engine.log` as the primary modern AL2/AL2023 deployment log.
- Narrowed the default health check path statement to load-balanced web environments using HTTP health checks, and changed the health check path example to the documented `aws:elasticbeanstalk:environment:process:default` `HealthCheckPath` option.
- Replaced `describe-environment-resources` for checking the instance profile because that command returns resources such as instance IDs, not the configured IAM instance profile. The post now uses `describe-configuration-settings` and filters for `IamInstanceProfile`.
- Changed the cleanup command so it checks whether the cache directory exists before removing it, preventing the cleanup from failing the deployment when the path is absent.
- Added `ecr:BatchCheckLayerAvailability` to the ECR pull policy example, matching AWS's documented ECR pull permissions.
- Updated Docker build and platform hook log commands to inspect `/var/log/eb-engine.log`, which is the documented deployment log for Amazon Linux 2 and Amazon Linux 2023 platforms.
- Added current platform caveats that newer Amazon Linux 2 and Amazon Linux 2023 Elastic Beanstalk platform releases automatically grant platform hook execute permissions and convert CRLF line endings.
- Added a short warning before terminating/recreating an environment to back up environment properties, secrets, and external data separately, since `eb config` does not show environment properties.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Several examples are intentionally generic, so users still need to adapt names such as `my-app`, `production`, IAM role names, and S3/ECR ARNs to their own environments.
