# Validation Summary: How to Use AWS App Runner for Simple Container Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS App Runner
- Amazon ECR
- AWS CLI
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Amazon VPC
- Route 53 / custom domains
- Node.js / Express health check endpoint

## Sources Consulted
- AWS App Runner product page: https://aws.amazon.com/apprunner/
- AWS App Runner Developer Guide, architecture and supported configurations: https://docs.aws.amazon.com/apprunner/latest/dg/architecture.html
- AWS CLI Command Reference, apprunner create-service: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-service.html
- AWS CLI Command Reference, apprunner create-auto-scaling-configuration: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-auto-scaling-configuration.html
- AWS App Runner Developer Guide, managing automatic scaling: https://docs.aws.amazon.com/apprunner/latest/dg/manage-autoscaling.html
- AWS App Runner Developer Guide, deploying a new application version: https://docs.aws.amazon.com/apprunner/latest/dg/manage-deploy.html
- AWS App Runner Developer Guide, referencing environment variables and secrets: https://docs.aws.amazon.com/apprunner/latest/dg/env-variable.html
- AWS App Runner Developer Guide, VPC access for outgoing traffic: https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html
- AWS App Runner Developer Guide, custom domain names: https://docs.aws.amazon.com/apprunner/latest/dg/manage-custom-domains.html

## Issues Found
- The post said App Runner scales from zero and suggested setting `min-size` to `0`. AWS CLI documentation currently requires `MinSize` to be at least `1`, and AWS describes inactive provisioned instances as capacity reserve. Updated the autoscaling description and `min-size` explanation.
- Several AWS CLI JSON snippets used lower camel case member names such as `imageRepository`, `runtimeEnvironmentSecrets`, and `egressConfiguration`. AWS's documented CLI JSON syntax uses modeled PascalCase member names such as `ImageRepository`, `RuntimeEnvironmentSecrets`, and `EgressConfiguration`. Updated the snippets to match the official CLI reference.
- The instance size table omitted several currently supported App Runner CPU/memory combinations. Added the missing supported configurations: 0.25 vCPU/1 GB, 1 vCPU/4 GB, 2 vCPU/6 GB, and 4 vCPU/10 GB.
- The post did not mention AWS's current App Runner availability change. AWS states that App Runner no longer accepts new customers starting April 30, 2026, while existing services remain operational. Added a concise caveat in the introduction and scoped the recommendation language to existing App Runner customers.
- The introduction implied there is never VPC networking to consider. Updated it to clarify that VPC networking is not needed unless the service must access private VPC resources.

## Review Notes
- The AWS CLI examples now match the documented App Runner operations and modeled fields. The local environment did not have the `aws` CLI installed, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
- Automatic deployments are supported for same-account Amazon ECR image repositories, but AWS does not support automatic deployments for ECR Public images or ECR repositories in a different AWS account.
- Secrets Manager and SSM Parameter Store references require the App Runner instance role to have permission to read the referenced secrets or parameters, and updated secret values are pulled during deployment.
