# Validation Summary: How to Implement Pulumi CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi IaC
- Pulumi CLI
- Pulumi Cloud
- Pulumi Deployments
- Pulumi GitHub Action
- GitHub Actions
- GitLab CI/CD
- AWS IAM, ECS, RDS, and Secrets Manager
- Pulumi secrets
- Pulumi StackReference
- Pulumi CrossGuard policy packs

## Sources Consulted
- Pulumi GitHub Actions documentation: https://www.pulumi.com/docs/iac/operations/continuous-delivery/github-actions/
- Pulumi GitHub Action input reference: https://github.com/pulumi/actions
- Pulumi GitLab CI/CD documentation: https://www.pulumi.com/docs/iac/operations/continuous-delivery/gitlab-ci/
- Pulumi CLI `preview` documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_preview/
- Pulumi CLI `stack select` documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_select/
- Pulumi CLI `destroy` documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_destroy/
- Pulumi CLI `stack rm` documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_rm/
- Pulumi secrets documentation: https://www.pulumi.com/docs/iac/concepts/secrets/
- Pulumi DeploymentSettings resource documentation: https://www.pulumi.com/registry/packages/pulumiservice/api-docs/deploymentsettings/
- Pulumi Review Stacks documentation: https://www.pulumi.com/docs/deployments/deployments/review-stacks/
- Pulumi PolicyPack API documentation: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/policy/classes/PolicyPack.html
- Pulumi ResourceValidationPolicy API documentation: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/policy/interfaces/ResourceValidationPolicy.html
- Pulumi AWS IAM Role documentation: https://www.pulumi.com/registry/packages/aws/api-docs/iam/role/

## Issues Found
- Updated all GitHub workflow examples from `pulumi/actions@v5` to the current documented `pulumi/actions@v7`.
- Fixed the basic GitHub Actions concurrency group. The original `pulumi-${{ github.ref }}` did not actually serialize all operations against the same `dev` stack, despite the comment saying it prevented state conflicts.
- Added required GitHub token permissions for workflows that comment on pull requests or create issue comments from PR workflows.
- Fixed the multi-stack GitHub Actions matrix secret lookup. The original matrix used lowercase stack names to construct uppercase secret names, so it would look for names like `AWS_ACCESS_KEY_ID_staging` instead of `AWS_ACCESS_KEY_ID_STAGING`.
- Fixed GitLab CI snippets to use the Pulumi Docker image with `entrypoint: [""]`, matching Pulumi's official GitLab guidance, and removed self-referential `PULUMI_ACCESS_TOKEN` variables.
- Replaced the invalid Pulumi Deployments `Pulumi.yaml` example. Deployment settings are stack deployment settings in Pulumi Cloud, REST API, or the Pulumi Cloud provider, not a `deployment:` block in `Pulumi.yaml`.
- Completed the StackReference TypeScript example by defining the referenced security group and ECS task definition before using them in the ECS service.
- Fixed the AWS Secrets Manager example to preserve Pulumi secret tracking when parsing the JSON secret string.
- Added the missing `@pulumi/aws` import to the CrossGuard policy pack example.

## Review Notes
The examples remain intentionally illustrative and still use placeholder stack names, AWS account IDs, repository names, URLs, and container images. Production users should pin tool/container versions where appropriate and prefer OIDC or Pulumi ESC over long-lived cloud credentials.
