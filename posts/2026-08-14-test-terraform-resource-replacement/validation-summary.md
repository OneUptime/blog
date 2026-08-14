# Validation Summary: Test Terraform Resource Replacement Before Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform configuration language (HCL) and modules
- Terraform CLI (`init`, `plan`, `show`, `apply`, and `destroy`)
- Terraform lifecycle rules (`create_before_destroy`, `prevent_destroy`, and `replace_triggered_by`)
- Terraform saved plans and JSON plan output
- `jq` plan-report filtering
- Terraform state, deposed objects, imports, and `moved` blocks
- Infrastructure transition, availability, rollback, and cleanup testing

## Sources Consulted
- [Terraform module block reference](https://developer.hashicorp.com/terraform/language/block/module)
- [Initialize the Terraform working directory](https://developer.hashicorp.com/terraform/cli/init)
- [`terraform init` command reference](https://developer.hashicorp.com/terraform/cli/commands/init)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform lifecycle meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Terraform validation order](https://developer.hashicorp.com/terraform/language/validate#order-of-validation)
- [`terraform plan` command reference](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [`terraform show` command reference](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform JSON output format](https://developer.hashicorp.com/terraform/internals/json-format)
- [Terraform data-source behavior](https://developer.hashicorp.com/terraform/language/data-sources)
- [Terraform module refactoring and `moved` blocks](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
- [Terraform state](https://developer.hashicorp.com/terraform/language/state)
- [Terraform state commands](https://developer.hashicorp.com/terraform/cli/commands/state)
- [`terraform state rm` command reference](https://developer.hashicorp.com/terraform/cli/commands/state/rm)
- [HashiCorp deposed-object recovery guidance](https://support.hashicorp.com/hc/en-us/articles/4409469235603-How-to-handle-issues-due-to-create-before-destroy-and-deposed-object)
- [Terraform test language and state sharing](https://developer.hashicorp.com/terraform/language/tests)

## Issues Found
1. **The harness exposed a test-only child-module input:** The example passed `test_run_id` directly to the reusable module despite saying that test-only behavior should remain in the root harness. Because child-module arguments must match declared inputs, this would require a test-specific module API. The root harness now incorporates the run ID into the generic `name` argument instead.
2. **Upgrade transitions omitted required reinitialization:** Changes to module sources or version constraints and provider requirements can require the working directory to be reinitialized. Added guidance to run `terraform init` with the intended provider lock file and to use `-upgrade` only for a deliberate dependency selection change.
3. **Deposed-object recovery implied that one deposed binding could be removed directly:** A normal resource address does not select only one opaque deposed incarnation, and `terraform state rm` removes all bindings for a matching address without deleting the remote objects. Replaced the ambiguous instruction with the documented sequence: let a subsequent apply retry deletion, or remove all bindings, re-import the desired object, and clean up the unwanted remote object.
4. **The `replace_triggered_by` scope was too broad:** The post said any change to any instance of a multi-instance resource could trigger replacement. The lifecycle documentation specifically describes a planned update or replacement of any instance. Updated the sentence to match that scope.
5. **Precondition timing needed a plan-time caveat:** Preconditions whose inputs are unknown during planning can be deferred until apply. Clarified that a precondition intended to report the prohibition before apply must have a condition known during planning; policy checks remain an alternative for inspecting and enforcing a plan.

## Review Notes
- The Terraform commands, flags, HCL syntax, JSON field paths, action ordering, and `jq` filter are valid against the current Terraform documentation.
- The two documented replacement action sequences are correctly interpreted: `["delete", "create"]` is destroy-before-create and `["create", "delete"]` is create-before-destroy.
- The narrow `jq` report intentionally excludes deferred data-source reads, output changes, and drift; the surrounding text correctly tells readers to inspect those parts of the full JSON plan separately.
- Saved binary plan files can also contain sensitive data. The post explicitly warns about generated JSON; production harnesses should protect both artifacts.
- The guide does not declare a minimum Terraform version. Relevant compatibility boundaries include Terraform v0.15.2+ for `-replace`, v1.1+ for `moved` blocks, and v1.2+ for preconditions.
- All external documentation links in the post resolve to the intended current pages.
