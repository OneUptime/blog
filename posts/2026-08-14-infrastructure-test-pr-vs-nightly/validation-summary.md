# Validation Summary: Choose Infrastructure Tests for Pull Requests and Nightly Runs

## Status
validated

## Post Type
Technical strategy guide

## Technologies Covered
- Terraform Core and the Terraform CLI
- Terraform test files, plan/apply test runs, and provider mocking
- Terraform providers, modules, version constraints, and dependency lock files
- Infrastructure testing in CI/CD pull-request and scheduled lanes
- GitHub Actions scheduled workflows and concurrency controls
- Open Policy Agent policy testing
- Cloud IAM, API quotas, resource cleanup, and test isolation

## Sources Consulted
- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform test command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform init command](https://developer.hashicorp.com/terraform/cli/commands/init)
- [Terraform validate command](https://developer.hashicorp.com/terraform/cli/commands/validate)
- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Terraform providers command](https://developer.hashicorp.com/terraform/cli/commands/providers)
- [Terraform version command](https://developer.hashicorp.com/terraform/cli/commands/version)
- [Terraform module configuration](https://developer.hashicorp.com/terraform/language/modules/configuration)
- [GitHub Actions events, including `schedule`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [GitHub Actions concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)
- [GitHub Actions workflow and job concurrency controls](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [Open Policy Agent policy testing](https://www.openpolicyagent.org/docs/policy-testing)
- [Open Policy Agent and Terraform plans](https://www.openpolicyagent.org/docs/terraform)
- [AWS IAM eventual consistency](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)
- [Google Cloud IAM access-change propagation](https://cloud.google.com/iam/docs/access-change-propagation)

## Issues Found
1. **GitHub Actions scheduled-run ref was too general.** The post said scheduled workflows run against a named branch and commit, which could imply that the branch for a GitHub Actions `schedule` event is selectable. GitHub runs scheduled workflows on the latest commit of the default branch. The text now states that behavior and advises recording any different ref explicitly checked out by the job.
2. **Authorization denials were classified as unconditionally non-transient.** AWS and Google Cloud document eventual consistency for IAM changes, so an authorization denial can be temporary immediately after a relevant access change. The retry guidance now treats denials as failures by default while allowing bounded polling when a documented IAM propagation window applies.

## Review Notes
- Terraform's test framework is available in Terraform 1.6 and later, and provider mocking is available in Terraform 1.7 and later, as the post correctly states for mocking.
- Mock providers generate fake computed values during apply by default. Plan-only mock tests that must assert on those values may need `override_during = plan`; the post's higher-level recommendation remains correct.
- `terraform init -upgrade` upgrades providers and refreshes installed child modules to versions allowed by their constraints; it does not upgrade the Terraform CLI. The post correctly recommends an isolated working directory and separately notes that remote module selections are not recorded in `.terraform.lock.hcl`.
- GitHub Actions scheduled runs can be delayed and, under sufficiently high load, dropped. A strict detection objective therefore also needs monitoring for missing scheduled runs or a scheduler with the required delivery guarantees.
- GitHub Actions concurrency groups are repository-scoped. When they are used to serialize pull-request and scheduled lanes, both workflows must share the intended group, and queue behavior must be configured if pending runs must not be replaced.
- All referenced documentation URLs were reachable and led to the intended official resources. The inline Terraform commands and flags are current and correctly described.
