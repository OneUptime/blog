# Validation Summary: How to Set Up Terraform in Bitbucket Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Bitbucket Pipelines
- Bitbucket deployment environments and deployment variables
- Bitbucket Pipelines caching, artifacts, manual triggers, stages, and changeset conditions
- Docker
- AWS credentials and Bitbucket Pipelines OIDC
- TFLint

## Sources Consulted
- Atlassian Bitbucket Pipelines step options: https://support.atlassian.com/bitbucket-cloud/docs/step-options/
- Atlassian Bitbucket Pipelines stages: https://support.atlassian.com/bitbucket-cloud/docs/stage-options/
- Atlassian Bitbucket deployment setup and monitoring: https://support.atlassian.com/bitbucket-cloud/docs/set-up-and-monitor-deployments/
- Atlassian Bitbucket Pipelines variables and secrets: https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/
- Atlassian Bitbucket Pipelines cache definitions: https://support.atlassian.com/bitbucket-cloud/docs/cache-and-service-container-definitions/
- Atlassian Bitbucket Pipelines artifacts: https://support.atlassian.com/bitbucket-cloud/docs/use-artifacts-in-steps/
- Atlassian Bitbucket Pipelines AWS OIDC deployment guide: https://support.atlassian.com/bitbucket-cloud/docs/deploy-on-aws-using-bitbucket-pipelines-openid-connect/
- Atlassian Bitbucket Pipelines max-time/global options: https://support.atlassian.com/bitbucket-cloud/docs/global-options/
- HashiCorp Terraform init command: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform plan command: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform apply tutorial / saved plan behavior: https://developer.hashicorp.com/terraform/tutorials/cli/apply
- HashiCorp Terraform show command: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform fmt command: https://developer.hashicorp.com/terraform/cli/commands/fmt
- HashiCorp Terraform Docker image listing: https://hub.docker.com/r/hashicorp/terraform/

## Issues Found
- The multi-environment pipeline used the same `deployment` environment on separate plan and apply steps in a single pipeline. Bitbucket deployment stages are the correct way to share one deployment environment across multiple steps, so the dev, staging, and production flows were changed to deployment stages.
- The pull request plan step used `deployment: test`, which would track a deployment even though the step only plans. Changed it to `environment: test` so it can access environment variables without recording a deployment.
- The Terraform provider cache example did not key the cache on `.terraform.lock.hcl`, while the text claimed providers are only downloaded when the lock file changes. Added a `key.files` cache definition and adjusted the explanation.
- The custom Docker image installed AWS CLI with `pip3 install awscli` on an Alpine-based image and then used `unzip` without installing it. Changed the example to install `aws-cli`, `wget`, and `unzip` with `apk`.
- The build-minute optimization example had a separate "Check Changes" step that exited successfully but would not stop later steps from running. Replaced it with Bitbucket `condition: changesets` on the plan and apply steps.
- The same optimization example applied `tfplan` without publishing it from the plan step. Added the Terraform plan file as an artifact.
- The manual approval limitation described write access as the only control. Updated it to mention Bitbucket Premium deployment permissions and branch permissions.

## Review Notes
- Terraform CLI flags shown for `init`, `plan`, `apply`, `show`, and `fmt` are valid for the pinned Terraform 1.7.5 examples.
- Bitbucket manual steps that depend on artifacts must be triggered before artifacts expire; Atlassian currently documents artifact retention as 14 days.
- The guide pins Terraform 1.7.5 and TFLint 0.50.3. Pinning is technically valid, but future maintenance should consider refreshing versions.
