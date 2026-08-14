# Validation Summary: Make Infrastructure Test Cleanup Survive Crashes

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Terratest v1
- Terraform CLI, state, backends, and test cleanup
- Go testing, deferred cleanup, contexts, signals, and test timeouts
- CI cleanup workflows and durable artifacts
- Cloud resource tagging, account isolation, and scheduled janitors

## Sources Consulted

- [Terratest quick start](https://terratest.gruntwork.io/docs/getting-started/quick-start/)
- [Terratest cleanup guidance](https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/)
- [Terratest v1 migration guide](https://terratest.gruntwork.io/docs/migrating-to-v1/overview/#migrating-to-the-context-variants)
- [Terratest v1.0.1 Terraform API](https://pkg.go.dev/github.com/gruntwork-io/terratest@v1.0.1/modules/terraform)
- [Terratest v1.0.1 `DestroyContext` implementation](https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/terraform/destroy.go) and [`InitAndApplyContext` implementation](https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/terraform/apply.go)
- [Go specification: defer statements](https://go.dev/ref/spec#Defer_statements)
- [Go `testing.T` documentation](https://pkg.go.dev/testing#T)
- [Go test flags](https://pkg.go.dev/cmd/go#hdr-Testing_flags) and [testing timeout implementation](https://go.dev/src/testing/testing.go)
- [Go `os.Exit`](https://pkg.go.dev/os#Exit), [`os/signal`](https://pkg.go.dev/os/signal), and [`context.WithTimeout`](https://pkg.go.dev/context#WithTimeout)
- [Terraform input variables](https://developer.hashicorp.com/terraform/language/values/variables)
- [Terraform state](https://developer.hashicorp.com/terraform/language/state) and [backend storage and locking](https://developer.hashicorp.com/terraform/language/state/backends)
- [Terraform sensitive-data guidance](https://developer.hashicorp.com/terraform/language/manage-sensitive-data) and [`terraform show`](https://developer.hashicorp.com/terraform/cli/commands/show)
- [`terraform state list`](https://developer.hashicorp.com/terraform/cli/commands/state/list), [`terraform state rm`](https://developer.hashicorp.com/terraform/cli/commands/state/rm), and [`terraform destroy`](https://developer.hashicorp.com/terraform/cli/commands/destroy)
- [Terraform import documentation](https://developer.hashicorp.com/terraform/cli/import)
- [Terraform provider resource creation lifecycle](https://developer.hashicorp.com/terraform/plugin/framework/resources/create)
- [`terraform test` cleanup guidance](https://developer.hashicorp.com/terraform/cli/commands/test)
- [RFC 1034: DNS concepts, caching, and refresh timeouts](https://www.rfc-editor.org/rfc/rfc1034.html)

## Issues Found

- The first Go example used `terraform.Destroy` and `terraform.InitAndApply`, which are deprecated in Terratest v1. It now uses the current `DestroyContext` and `InitAndApplyContext` helpers with separate bounded operation and cleanup contexts.
- The post incorrectly stated that context-capable Terraform helpers required the Terratest v2 beta submodule. Stable Terratest v1 provides them on the existing package path, so the prose and API links were updated to v1.0.1.
- The Go timeout guidance understated the behavior of `go test -timeout`. It is a hard timeout implemented by a panic from an alarm goroutine and does not reliably unwind the active test goroutine. The post now requires shorter operation deadlines and reserves cleanup time below both Go and CI hard timeouts.
- The HCL snippet referenced `var.expires_at` and `var.repository` without declaring them, and the Go options did not supply them. Both variables are now declared and passed alongside `test_run_id`.
- The remote-backend wording implied that a backend key itself was encrypted and did not clearly qualify locking as a backend capability. It now requires a unique state key or path on a backend that provides state-at-rest encryption and locking.
- The state-security wording said state always contains sensitive values and prohibited all printing, despite later recommending `terraform show`. It now says state can contain sensitive values and specifically prohibits exposure in unprotected logs or commits.
- The recovery step's phrase “import or remove objects” was ambiguous because not every resource supports import and `terraform state rm` does not delete the remote object. It now distinguishes importing supported objects from deleting clearly owned unmanaged objects.
- The `terraform destroy` explanation was tightened to say that Terraform uses configuration and state to plan deletion of managed objects and does not discover arbitrary cloud resources.
- The fixture guidance classified long DNS TTLs only as a teardown blocker even though their main risk is a cached effect after deletion. The introduction now covers both teardown blockers and effects that outlive the test.
- The opening cleanup explanation and panic wording were clarified to distinguish hook execution from successful authenticated teardown and to limit deferred panic cleanup to panics that unwind the test goroutine.

## Review Notes

- The corrected examples target Terratest v1.0.1, whose module declares Go 1.26.0 as its minimum Go version.
- A `t.Cleanup` callback should create a fresh bounded cleanup context like the one shown in the post; Go cancels `t.Context()` before cleanup callbacks run.
- Parallel tests must still isolate their working directories and state keys. The post's unique-backend guidance covers the state requirement, but the introductory snippet does not show backend configuration.
- Consider documenting `ExpiresAt` as a UTC RFC 3339 value so every janitor implementation parses it consistently.
- The linked Terratest test-stage mechanism preserves data in the working directory for local iteration; it is not a substitute for external durable state after runner loss.
