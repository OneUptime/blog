# Validation Summary: Why Terraform Tests Pass Locally but Fail in CI

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Terraform Core and the Terraform CLI
- Native Terraform tests and provider mocking
- Terraform providers, modules, dependency lock files, and installation mirrors
- Terratest and Go test-result caching
- CI/CD runners, concurrency, credentials, networking, quotas, and cleanup
- GitHub Actions fork security and OpenID Connect
- AWS provider configuration, Availability Zones, and IAM propagation
- Google Cloud IAM propagation and retry behavior
- Azure RBAC propagation and Azure Storage name reuse

## Sources Consulted

- [Terraform test command](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform 1.6 changelog](https://github.com/hashicorp/terraform/blob/v1.6.0/CHANGELOG.md)
- [Terraform 1.7 changelog](https://github.com/hashicorp/terraform/blob/v1.7.0/CHANGELOG.md)
- [Terraform 1.12 changelog](https://github.com/hashicorp/terraform/blob/v1.12.0/CHANGELOG.md)
- [Terraform init command](https://developer.hashicorp.com/terraform/cli/commands/init)
- [Terraform validate command](https://developer.hashicorp.com/terraform/cli/commands/validate)
- [Terraform fmt command](https://developer.hashicorp.com/terraform/cli/commands/fmt)
- [Terraform version command](https://developer.hashicorp.com/terraform/cli/commands/version)
- [Terraform providers command](https://developer.hashicorp.com/terraform/cli/commands/providers)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform providers lock command](https://developer.hashicorp.com/terraform/cli/commands/providers/lock)
- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Terraform `required_version` reference](https://developer.hashicorp.com/terraform/language/block/terraform#required_version)
- [Terraform CLI environment variables](https://developer.hashicorp.com/terraform/cli/config/environment-variables)
- [Terraform CLI configuration and host-specific credentials](https://developer.hashicorp.com/terraform/cli/config/config-file)
- [Terraform dependency-graph parallelism](https://developer.hashicorp.com/terraform/internals/graph#walking-the-graph)
- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform show command](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform sensitive-data management](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
- [Terraform provider log filtering](https://developer.hashicorp.com/terraform/plugin/log/filtering)
- [AWS provider documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Availability Zone IDs](https://docs.aws.amazon.com/global-infrastructure/latest/regions/az-ids.html)
- [AWS IAM eventual consistency](https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot.html#troubleshoot_general_eventual-consistency)
- [Google Cloud IAM access-change propagation](https://cloud.google.com/iam/docs/access-change-propagation)
- [Google Cloud IAM retry strategy](https://cloud.google.com/iam/docs/retry-strategy)
- [Azure RBAC troubleshooting and propagation](https://learn.microsoft.com/en-us/azure/role-based-access-control/troubleshooting#role-assignment-changes-are-not-being-detected)
- [Azure Storage transient name conflicts](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/blobs/alerts/troubleshoot-storage-client-application-errors#the-client-is-receiving-http-409-conflict-messages)
- [Go test command and result caching](https://pkg.go.dev/cmd/go)
- [Terratest guidance on avoiding test caching](https://terratest.gruntwork.io/docs/testing-best-practices/avoid-test-caching/)
- [GitHub Actions secrets in fork-triggered workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitHub Actions OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)
- [GitHub-hosted runner private networking](https://docs.github.com/en/actions/concepts/runners/private-networking)

## Issues Found

1. **Retry classification was too broad.** The post grouped authorization errors and name collisions with failures that should not be retried as eventual consistency. AWS, Google Cloud, and Azure document propagation delays that can temporarily produce authorization failures, and Azure Storage documents a brief name-reuse delay after deletion. The guidance now fails fast by default but permits a retry only when the service documents that exact authorization or name-conflict condition as transient.

## Review Notes

- The current generally available native Terraform test framework is available in Terraform 1.6 and later, and provider mocking is available in Terraform 1.7 and later, as stated.
- The shell commands and HCL provider configuration are syntactically valid and use current commands and fields. `terraform validate` requires initialization, and the example runs `terraform init` first.
- `.terraform.lock.hcl` records provider selections and checksums, not remote module selections. `terraform init -upgrade` ignores recorded provider selections and chooses the newest versions allowed by the configured constraints, as stated.
- Native `terraform test` keeps test state in memory and separate from existing configuration state. Isolating state and working directories remains necessary for Terratest and concurrent ordinary Terraform CLI runs.
- The `-parallelism` statement is correct as a general scope distinction: it limits concurrency within Terraform operations and does not coordinate independent CI jobs. The `terraform test -parallelism` option itself is available only in Terraform 1.12 and later.
- AWS now uses independently mapped Availability Zone names only for accounts created before November 2025 in specified legacy Regions. The post's qualified statement that names can differ across accounts remains accurate.
- All external links in the post were reachable and led to the intended resources. The older GitHub Actions OIDC URL redirects to GitHub's current canonical OIDC documentation.
