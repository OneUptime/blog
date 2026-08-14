# Validation Summary: Test Terraform Modules Across Core and Provider Versions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Core and Terraform CLI
- Terraform provider requirements and version constraints
- Terraform dependency lock files
- Terraform native tests and provider mocking
- HashiCorp AWS provider
- HCL configuration
- GitHub Actions compatibility matrices
- Terraform state and plan security

## Sources Consulted
- Terraform block and `required_version` reference: https://developer.hashicorp.com/terraform/language/block/terraform
- Terraform provider requirements: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform version constraints: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform dependency lock file: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- `terraform init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- `terraform providers` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers
- `terraform providers lock` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- `terraform validate` command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- `terraform test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform test language and version availability: https://developer.hashicorp.com/terraform/language/tests
- Terraform provider mocking: https://developer.hashicorp.com/terraform/language/tests/mocking
- Terraform v1.x compatibility promises: https://developer.hashicorp.com/terraform/language/v1-compatibility-promises
- Terraform plan, JSON output, and sensitive-data guidance: https://developer.hashicorp.com/terraform/cli/commands/plan, https://developer.hashicorp.com/terraform/cli/commands/show, https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform 1.6.6 and 1.15.0 releases: https://releases.hashicorp.com/terraform/1.6.6/, https://github.com/hashicorp/terraform/releases/tag/v1.15.0
- HashiCorp AWS provider 5.40.0 release: https://github.com/hashicorp/terraform-provider-aws/releases/tag/v5.40.0
- HashiCorp setup-terraform action and v4 release: https://github.com/hashicorp/setup-terraform, https://github.com/hashicorp/setup-terraform/releases/tag/v4.0.1
- actions/checkout v7 release: https://github.com/actions/checkout/releases/tag/v7.0.1
- GitHub Actions workflow syntax and context reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax, https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions secure-use guidance: https://docs.github.com/en/actions/reference/security/secure-use

## Issues Found
- The post tied the module's Terraform minimum to test-only features. I separated the runtime configuration minimum from the potentially higher test-runner minimum because `required_version` controls which Terraform CLI versions may run the module configuration.
- The compatibility harness layout did not state that tests must live with each harness. I added that requirement because `terraform test` searches the current root and its test directory, not the source directory of a called child module; without harness-local test files, the matrix could execute no intended tests.
- The consumer-baseline command allowed `terraform init` to update the committed lock file despite saying the lane should use it exactly. I added `-lockfile=readonly` so the job verifies the recorded selections and checksums without rewriting the file.
- The provider-upgrade discussion did not mention that `terraform init -upgrade` also upgrades remote modules to the newest versions allowed by their constraints. I added a caveat to hold remote-module selections constant when isolating provider compatibility.
- The CI example printed `terraform version` but did not enforce the matrix version, despite saying a fallback must fail. I changed the step to compare the reported version with the exact matrix value using `grep -Fx`.
- The Terraform v1.x compatibility wording was overly broad about module behavior. I clarified that the promises cover a large subset of valid Core language and workflow behavior but exclude individual provider behavior, remote APIs, and newer releases of external modules.

## Review Notes
- Both HCL examples parse successfully and use valid `required_version` and `required_providers` constraint syntax. AWS provider 5.40.0 is an actual published provider version.
- Terraform's current native test framework is available in 1.6.0 and later, and provider mocking is available in 1.7.0 and later, matching the corrected post.
- Terraform 1.6.6 and 1.15.0 are valid stable releases. As of the validation date, HashiCorp documents 1.15.x as the latest stable series and 1.16.x as beta.
- `actions/checkout@v7` and `hashicorp/setup-terraform@v4` exist, the matrix expressions and `working-directory` usage are valid, and the YAML snippet parses correctly.
- The post correctly distinguishes provider constraints from lock-file selections, explains that the lock file belongs to the complete root configuration, and notes that remote module selections are not currently locked.
- `terraform providers` reports provider requirements and their origins; the lock file remains the authoritative artifact in this workflow for the exact selected provider versions.
- The warning about saved plans, machine-readable output, and state exposing sensitive values is consistent with HashiCorp's official security guidance.
- All external documentation links in the post returned successful responses during review. The post also correctly notes that action tags are mutable and that full commit SHAs are the strongest production pin.
