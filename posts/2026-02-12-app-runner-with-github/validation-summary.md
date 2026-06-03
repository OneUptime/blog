# Validation Summary: How to Set Up App Runner with GitHub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS App Runner
- GitHub source repository integration
- AWS CLI
- App Runner managed runtimes
- App Runner configuration file (`apprunner.yaml`)
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Amazon CloudWatch Logs
- Amazon ECR

## Sources Consulted
- AWS App Runner availability change: https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html
- AWS App Runner service based on source code: https://docs.aws.amazon.com/apprunner/latest/dg/service-source-code.html
- AWS App Runner configuration file reference: https://docs.aws.amazon.com/apprunner/latest/dg/config-file-ref.html
- AWS App Runner Node.js platform guide: https://docs.aws.amazon.com/apprunner/latest/dg/service-source-code-nodejs.html
- AWS CLI `apprunner create-service` reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-service.html
- AWS CLI `apprunner create-connection` reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-connection.html
- AWS CLI `apprunner list-connections` reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/list-connections.html
- AWS App Runner CloudWatch Logs documentation: https://docs.aws.amazon.com/apprunner/latest/dg/monitor-cwl.html
- AWS CLI `logs filter-log-events` reference: https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html

## Issues Found
- Added a current availability caveat because AWS App Runner is no longer open to new AWS customers; existing customers can continue using it, and AWS recommends ECS Express Mode for new workloads.
- Corrected the GitHub source workflow description. App Runner source-code services use managed runtimes; they do not build an arbitrary Dockerfile from a GitHub repository. Dockerfile/image workflows should build an image and deploy it through ECR.
- Replaced the non-existent `aws apprunner describe-connection` command with `aws apprunner list-connections --connection-name`, which is the documented AWS CLI command for checking connection status.
- Updated Node.js examples from `nodejs18` / `NODEJS_18` to `nodejs22` / `NODEJS_22` because App Runner Node.js 18 has an end-of-support date of December 1, 2025.
- Corrected AWS CLI JSON structure examples to use the documented PascalCase member names such as `CodeRepository`, `SourceCodeVersion`, `ConfigurationSource`, `RuntimeEnvironmentVariables`, and `RuntimeEnvironmentSecrets`.
- Removed the invalid Dockerfile-based App Runner code configuration example using `runtime: "DOCKER"` because `DOCKER` is not a valid `CodeConfigurationValues.Runtime` value.
- Replaced the Docker layer caching claim with a neutral deployment-time statement because the reviewed AWS documentation does not document Docker layer caching for App Runner source-code deployments.
- Corrected CloudWatch log group names. App Runner creates service/deployment logs under `/aws/apprunner/{service-name}/{service-id}/service`, not `/build`.
- Replaced the build-log retrieval example with `aws logs filter-log-events --log-stream-name-prefix "deployment/"`, which matches App Runner deployment log stream naming and avoids an invalid `describe-log-streams` option combination.
- Corrected the out-of-memory guidance so it no longer claims App Runner instance configuration controls build memory.
- Replaced the Dockerfile troubleshooting item with managed-runtime troubleshooting guidance.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI checks were performed against the official AWS CLI command reference instead of local `--help` output.
