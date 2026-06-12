# Validation Summary: How to Implement Pulumi Stacks for Environments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Pulumi stacks and configuration
- Pulumi TypeScript SDK
- Pulumi AWS provider
- Pulumi Random provider
- AWS VPC, subnets, security groups, ECS, and RDS
- Pulumi stack references
- Pulumi CLI
- GitHub Actions with pulumi/actions

## Sources Consulted
- Pulumi Stacks documentation: https://www.pulumi.com/docs/iac/concepts/stacks/
- Pulumi Configuration API documentation: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/Config.html
- Pulumi Secrets documentation: https://www.pulumi.com/docs/iac/concepts/secrets/
- Pulumi Inputs and Outputs documentation: https://www.pulumi.com/docs/iac/concepts/inputs-outputs/
- Pulumi `pulumi new` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_new/
- Pulumi `pulumi stack init` / stack creation documentation: https://www.pulumi.com/docs/iac/concepts/stacks/#create-a-stack
- Pulumi `pulumi stack select` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_select/
- Pulumi `pulumi config set` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_config_set/
- Pulumi `pulumi preview` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_preview/
- Pulumi `pulumi up` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_up/
- Pulumi `pulumi refresh` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_refresh/
- Pulumi `pulumi cancel` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_cancel/
- Pulumi `pulumi stack export` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_export/
- Pulumi AWS RDS Instance documentation: https://www.pulumi.com/registry/packages/aws/api-docs/rds/instance/
- Pulumi AWS EC2 Subnet documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/subnet/
- Pulumi Actions repository and releases: https://github.com/pulumi/actions

## Issues Found
- The stack definition said each stack has its own "state file." Pulumi stacks have isolated state, but depending on the backend this is not necessarily a local file. Changed the wording to "state and configuration values."
- The configuration loader comment referred to `requireString`, but the TypeScript SDK method used in the code is `Config.require`. Updated the comment to match the actual API.
- The secrets section said Pulumi encrypts secrets automatically and that secret values are never displayed in logs or state. Pulumi encrypts values marked as secrets and redacts them from CLI output, but encrypted secret values are still stored in state. Updated the wording and comment for accuracy.
- Two standalone TypeScript snippets used `aws.*` resources without importing `@pulumi/aws`. Added the missing imports.
- The GitHub Actions workflow used `pulumi/actions@v5`, while the current major release is v7. Updated the workflow examples to `pulumi/actions@v7`.

## Review Notes
The main Pulumi stack concepts, stack configuration file format, CLI commands, stack references, `pulumi.all` usage, resource options, drift detection command, and AWS resource arguments are consistent with the consulted documentation. The Pulumi CLI was not installed in the local environment, so CLI verification was performed against official Pulumi CLI documentation rather than local `--help` output.
