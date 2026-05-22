# Validation Summary: How to Set Up Terraform in CircleCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- CircleCI configuration and workflows
- CircleCI Terraform orb
- CircleCI contexts and approval jobs
- CircleCI caches, workspaces, artifacts, and resource classes
- Docker executor images
- AWS authentication with CircleCI OIDC

## Sources Consulted
- CircleCI configuration reference: https://circleci.com/docs/reference/configuration-reference/
- CircleCI OpenID Connect tokens: https://circleci.com/docs/guides/permissions-authentication/openid-connect-tokens/
- CircleCI contexts documentation: https://circleci.com/docs/guides/security/contexts/
- CircleCI orbs overview: https://circleci.com/docs/orbs/use/orb-intro/
- CircleCI Terraform orb registry data: https://circleci.com/developer/orbs/orb/circleci/terraform
- Terraform CLI `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI saved plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform CLI `fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform backend configuration reference: https://developer.hashicorp.com/terraform/language/settings/backends/configuration
- HashiCorp Terraform Docker image: https://hub.docker.com/r/hashicorp/terraform/
- AWS CLI role with web identity documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
- Terraform AWS provider authentication documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The Terraform orb example used `circleci/terraform@3.2`, did not require `terraform/validate` before `terraform/plan`, and did not persist or attach the plan workspace for the apply job. Updated it to `circleci/terraform@3.2.1`, made `plan` require `validate`, enabled `persist-workspace`, attached the workspace in `apply`, and passed `plan: plan.out` so the reviewed plan is what gets applied.
- The CircleCI OIDC example attempted to fetch a token through `CIRCLE_OIDC_TOKEN_URL`, which is not part of CircleCI's documented OIDC environment variables, and depended on `aws` and `jq` without installing them. Replaced it with the documented `CIRCLE_OIDC_TOKEN_V2` environment variable and AWS web identity environment variables supported by the Terraform AWS provider.
- The "Pull Request-Only Plans" section described behavior that the shown branch filters do not strictly enforce. Renamed it to "Pull Request and Feature Branch Plans" and adjusted the lead sentence to match the actual `branches.ignore: main` behavior.

## Review Notes
- The custom pipeline examples use Terraform 1.7.5 as a pinned version. The commands remain valid, but future readers may want to update the pinned Terraform version during routine maintenance.
- The provider cache example is technically valid for CircleCI caching, but teams should be careful when sharing provider caches across differing operating systems or architectures.
