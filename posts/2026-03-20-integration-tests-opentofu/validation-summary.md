# Validation Summary: How to Set Up Integration Tests for OpenTofu Configurations

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL test files
- AWS provider usage in integration tests
- GitHub Actions
- AWS OIDC authentication for CI

## Sources Consulted
- OpenTofu `test` command: https://opentofu.org/docs/cli/commands/test/
- OpenTofu `init` command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu module sources: https://opentofu.org/docs/language/modules/sources/
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials` GitHub Action: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions OIDC reference: https://docs.github.com/en/actions/reference/security/oidc
- GitHub Actions environments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- GitHub Actions deployments and environments reference: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

## Issues Found
- The post's multi-step example was technically incorrect. OpenTofu destroys temporary resources after each `run` block completes, so a later `run` block cannot rely on earlier live infrastructure continuing to exist. I replaced that example with a helper-module pattern that composes dependent modules into a single `apply` run.
- The integration test commands used `tofu test tests/integration/`, but the official CLI uses `-test-directory=...` and `-filter=...` rather than a positional test-directory argument. I corrected the command examples accordingly.
- The command section omitted `tofu init`, which OpenTofu requires before commands that depend on initialization. I added `tofu init` before the test commands.
- The `AWS_PROFILE` example described profile selection as "workspace/account", which was inaccurate. `AWS_PROFILE` selects an AWS credentials profile, not an OpenTofu workspace. I corrected the wording to "AWS profile/account."
- The network rule assertion checked only `rule.cidr_blocks[0]`, which could miss a matching CIDR later in the list and could fail on rules without a first CIDR entry. I changed it to use `contains(rule.cidr_blocks, "10.0.0.0/8")`.
- The CI workflow was missing `id-token: write`, which the official AWS credentials action requires when assuming a role through GitHub OIDC. I added the required workflow permissions.
- The CI workflow installed OpenTofu but did not initialize the working directory before running tests. I added a `tofu init` step.
- The CI workflow used `opentofu/setup-opentofu@v1`, while the action's current documented usage is `@v2`. I updated the workflow snippet.
- The CI workflow comment implied that setting `environment: test` automatically requires approval for pull requests. GitHub only enforces approval when protection rules such as required reviewers are configured on that environment. I corrected the comment.

## Review Notes
- The post is technically sound after these fixes, but the renamed network example still validates security group configuration rather than end-to-end application connectivity. A future revision could add a helper module with data sources or checks if the goal is to demonstrate real connectivity validation.
- The local workspace does not have the `tofu` binary installed, so CLI verification was done against the official OpenTofu documentation and official action documentation rather than local `--help` output.
