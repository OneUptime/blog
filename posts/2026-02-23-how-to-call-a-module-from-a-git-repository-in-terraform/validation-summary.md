# Validation Summary: How to Call a Module from a Git Repository in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform module source addresses
- Git repositories
- GitHub module sources
- SSH authentication
- HTTPS Git authentication
- Terraform CLI

## Sources Consulted
- Terraform v1.5 Module Sources: https://developer.hashicorp.com/terraform/language/v1.5.x/modules/sources
- Terraform v1.5 Module Blocks: https://developer.hashicorp.com/terraform/language/v1.5.x/modules/syntax
- Terraform latest module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Git environment variables documentation: https://git-scm.com/docs/git
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Issues Found
- The HTTPS token module source used `source = "git::https://${var.github_token}@github.com/..."`. Terraform v1.5 requires the module `source` argument to be a literal string with no template sequences, so this would not work with the post's own `required_version = ">= 1.5.0"` example. Changed it to a literal HTTPS URL placeholder using username and token fields.
- The `GIT_ASKPASS` example used `export GIT_ASKPASS="echo $GITHUB_TOKEN"`. Git expects `GIT_ASKPASS` to point to a program it can execute, so the example was misleading. Changed it to show an executable helper path.
- The CI/CD URL rewrite used `oauth2` as the username in a GitHub-specific example. GitHub personal access tokens are used as the HTTPS password, paired with a username. Changed the example to use `${GITHUB_USERNAME}:${GITHUB_TOKEN}`.
- The full working example referenced `module.cluster.id`, but no `cluster` module was defined in the example. Changed the value to `var.cluster_id` and added a matching `cluster_id` variable declaration.

## Review Notes
- The Terraform Git source syntax, GitHub shorthand, `//` subdirectory placement, `?ref=` examples for tags/branches/commit SHAs, SSH-key behavior, and `terraform init -upgrade` guidance are consistent with official Terraform documentation.
- The module input names in the examples are illustrative and depend on the implementation of the referenced modules.
