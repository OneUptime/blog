# Validation Summary: How to Keep Real-Cloud Infrastructure Tests Fast and Affordable

## Status

validated

## Post Type

Technical guide / best-practices guide

## Technologies Covered

- Terraform native testing (`terraform test`, plan and apply runs, provider mocks, expected failures, state, and saved plans)
- Terraform dependency lock files, provider plugin caches, and provider mirrors
- Terratest
- Go testing, parallel subtests, cleanup callbacks, test caching, and test timeouts
- CI/CD concurrency and change-impact filtering
- Cloud service quotas, retry behavior, tagging, cost attribution, and resource cleanup
- AWS cost allocation tags

## Sources Consulted

- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform test command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform apply command](https://developer.hashicorp.com/terraform/cli/commands/apply)
- [HashiCorp tutorial: Create a Terraform plan](https://developer.hashicorp.com/terraform/tutorials/cli/plan)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform CLI configuration, provider mirrors, and plugin cache](https://developer.hashicorp.com/terraform/cli/config/config-file)
- [Terraform working-directory initialization](https://developer.hashicorp.com/terraform/cli/init)
- [Terraform state](https://developer.hashicorp.com/terraform/language/state)
- [Terraform v1.15.8 test argument implementation](https://github.com/hashicorp/terraform/blob/v1.15.8/internal/command/arguments/test.go)
- [Terraform v1.15.8 test command implementation](https://github.com/hashicorp/terraform/blob/v1.15.8/internal/command/test.go)
- [Terratest cleanup guidance](https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/)
- [Terratest guidance on avoiding Go test caching](https://terratest.gruntwork.io/docs/testing-best-practices/avoid-test-caching/)
- [Terratest v1 migration overview](https://terratest.gruntwork.io/docs/migrating-to-v1/overview/)
- [Terratest v1.0.0 destroy helper source](https://github.com/gruntwork-io/terratest/blob/v1.0.0/modules/terraform/destroy.go)
- [Go `testing` package](https://pkg.go.dev/testing)
- [Go command documentation](https://pkg.go.dev/cmd/go#hdr-Test_packages)
- [AWS: Activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS Guidance for Tagging](https://docs.aws.amazon.com/solutions/tagging-on-aws/)
- [AWS Service Quotas introduction](https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html)
- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [Azure Cost Management: How tags are used in cost and usage data](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data)

## Issues Found

1. **Plan-only tests were described as API-free.** A Terraform plan does not create managed resources, but a real provider can still refresh remote objects, read data sources, or otherwise call provider APIs. The opening now distinguishes plan runs, which avoid resource creation, from provider mocks, which avoid cloud API calls.
2. **The negative variable-validation row omitted `expect_failures`.** A custom variable validation failure makes `terraform test` fail unless the relevant variable is declared in the run block's `expect_failures`. Added that requirement to the test-inventory table.
3. **The saved-plan guidance treated every credential rotation as invalidating the plan.** Terraform does not record environment-variable values such as provider credentials in a plan file, so equivalent short-lived credentials can legitimately rotate between plan and apply. The paragraph now says the saved plan must still represent the intended configuration, variables, provider selections, and state, and that replacement credentials must target the intended environment.
4. **Cost allocation tag activation was presented as cloud-neutral.** Activation of user-defined cost allocation tag keys is an AWS-specific requirement; other clouds expose tags in billing through different mechanisms. Scoped the instruction explicitly to AWS.
5. **The Terratest cleanup guidance named the deprecated `terraform.Destroy` helper.** Terratest v1 deprecates non-context helpers, and its current cleanup example uses `terraform.DestroyContext`. Updated the post to recommend the current context-aware helper with the test context and options.

## Review Notes

- Terraform's current native test framework requires Terraform 1.6 or later; provider mocking requires Terraform 1.7 or later. The post does not claim compatibility with older versions.
- The HCL module example is syntactically valid, assuming the referenced module declares the shown inputs and the test harness declares `var.test_run_id`.
- The Go parent/subtest example is correct: parallel subtests finish before the parent test's cleanup runs, and `T.Cleanup` callbacks execute in last-added, first-called order.
- `go test -count=1 -timeout=45m ./test/integration/...` is valid. `-count=1` prevents reuse of a cached successful result, and the timeout covers the test binary's full execution, including cleanup.
- The `-parallelism` explanation was verified against Terraform v1.15.8 source. It limits concurrent operations inside a plan or apply; current Terraform separately uses `-run-parallelism` for parallel native test runs. Neither controls concurrency across CI jobs.
- Terraform's shared plugin cache is not guaranteed to be safe for simultaneous `terraform init` calls. The post's cache recommendation is sound for isolated per-job caches or serialized use; a writable cache directory should not be shared concurrently.
- AWS notes that a new tag key can take up to 24 hours to appear for activation and up to another 24 hours to activate. This delay does not change the post's guidance but matters when validating a new cost dashboard.
- All nine external links in the post returned successfully and led to the intended documentation or author profile; the author URL redirects to GitHub's canonical form.
