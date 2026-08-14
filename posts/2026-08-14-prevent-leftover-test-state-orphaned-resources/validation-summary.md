# Validation Summary: Prevent Orphaned Infrastructure From Poisoning Later Tests

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Terraform CLI, state, backends, workspaces, locking, import, and native tests
- HashiCorp Configuration Language (HCL)
- Terratest
- Go's `testing` and `context` packages
- CI/CD infrastructure-test isolation and teardown
- Cloud resource tagging, leases, reconciliation, and governance

## Sources Consulted

- [Terraform `test` command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform test language, in-memory state, and module cleanup](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform state purpose and dependency metadata](https://developer.hashicorp.com/terraform/language/state/purpose)
- [Terraform state locking](https://developer.hashicorp.com/terraform/language/state/locking)
- [Terraform `plan` command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform state commands](https://developer.hashicorp.com/terraform/cli/commands/state), including [`state list`](https://developer.hashicorp.com/terraform/cli/commands/state/list), [`state show`](https://developer.hashicorp.com/terraform/cli/commands/state/show), [`state pull`](https://developer.hashicorp.com/terraform/cli/commands/state/pull), and [`state rm`](https://developer.hashicorp.com/terraform/cli/commands/state/rm)
- [Terraform `force-unlock` command](https://developer.hashicorp.com/terraform/cli/commands/force-unlock)
- [Terraform import overview](https://developer.hashicorp.com/terraform/language/import)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform configuration and identifier syntax](https://developer.hashicorp.com/terraform/language/syntax/configuration) and [types and values](https://developer.hashicorp.com/terraform/language/expressions/types)
- [Terratest cleanup guidance](https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/)
- [Terratest v1 migration and context-aware APIs](https://terratest.gruntwork.io/docs/migrating-to-v1/overview/)
- [Go `testing` package documentation](https://pkg.go.dev/testing), especially `T.Cleanup` and `T.Context`, and the [`context` package](https://pkg.go.dev/context)
- [GitHub Actions `github` context](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#github-context)
- [AWS IAM policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html) and [NIST negative-testing guidance](https://doi.org/10.6028/NIST.IR.8397)
- [Azure Resource Manager asynchronous deletion behavior](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/delete-resource-group) and [Azure Key Vault soft-delete behavior](https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview)

## Issues Found

- The ownership-tag and backend-key examples omitted the run attempt and test name even though the post defined both as parts of the run identity. Added `run-attempt` and `test-name` tags and path components so reruns and parallel tests do not silently share state.
- The orphaned-policy example said an unexpected access grant could make a negative security test pass. A correctly written negative authorization test should fail when forbidden access succeeds, so the text now says it fails misleadingly.
- The lock example said a locked state blocks all later plans. Narrowed this to later operations that require the same lock because locking is backend- and operation-dependent, and supported commands can bypass locking with the discouraged `-lock=false` option.
- The Go example and Terratest guidance used the deprecated non-context helpers `InitAndApply` and `Destroy`. Updated them to `InitAndApplyContext` and `DestroyContext`.
- A `T.Cleanup` callback cannot reuse `t.Context()` because Go cancels that context just before cleanup callbacks begin. Added a fresh, bounded teardown context inside the callback and documented the lifecycle distinction.
- The recovery guidance referred only to the original state and provider version. Updated it to retain a trusted matching configuration and dependency lock file, which are needed to reproduce provider configuration and selections safely.
- The state-command bullet implied that `state list` can display sensitive attributes. Split the behavior accurately: `state list` prints tracked addresses, while `state show` displays stored resource attributes and should be treated as potentially sensitive.

## Review Notes

- The HCL ownership map is syntactically valid. Hyphens are permitted in Terraform identifiers and therefore in these unquoted object keys.
- Terraform's native test state, cleanup reporting, state removal, import, state pull, and force-unlock descriptions match the current official documentation.
- The Go excerpt is intentionally partial: `newTerraformOptions`, `destroyAndReport`, and `assertServiceBehavior` are application-specific helpers, and the 15-minute teardown deadline should be tuned to the tested services.
- Validation used the current Terraform 1.15.x documentation and current Terratest v1 guidance, which prefers context-aware helpers and requires Go 1.26 or newer.
- All links in the post resolved to the intended documentation pages during review.
