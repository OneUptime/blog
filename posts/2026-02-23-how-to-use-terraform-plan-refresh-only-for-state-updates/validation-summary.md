# Validation Summary: How to Use terraform plan -refresh-only for State Updates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform refresh-only planning and apply mode
- GitHub Actions
- jq

## Sources Consulted
- HashiCorp Terraform CLI `refresh` command documentation: https://developer.hashicorp.com/terraform/cli/commands/refresh
- HashiCorp Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Terraform machine-readable UI documentation: https://developer.hashicorp.com/terraform/internals/machine-readable-ui
- HashiCorp Terraform refresh-only tutorial: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- HashiCorp Terraform resource drift tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-drift
- actions/github-script README: https://github.com/actions/github-script

## Issues Found
- The post said `terraform plan -refresh-only` was introduced in Terraform 1.1. Official Terraform documentation states that `-refresh-only` for `plan` and `apply` was introduced in Terraform v0.15.4, so the version was corrected.
- The post described refresh-only mode as stopping after only the refresh step. Official documentation defines refresh-only mode as updating Terraform state and root module output values to match remote objects, so the explanation was made more precise.
- The post said a deleted resource removed from state by `terraform refresh` would be impossible to recreate with a simple `terraform apply`. Terraform would normally propose creating a configured resource that is no longer in state, so the sentence was corrected to describe the real risk: the deletion is accepted into state without review.
- The GitHub Actions drift workflow treated Terraform plan errors as "no drift" and did not explicitly grant issue creation permissions. The workflow now exits on unexpected plan errors and sets `contents: read` and `issues: write` permissions.
- The `actions/github-script` example called `github.rest.issues.create` without `await`. The call was updated to `await github.rest.issues.create(...)` to match the async examples in the official action documentation.
- The issue body in the `actions/github-script` example used a JavaScript template literal containing unescaped Markdown code-fence backticks, which would break the script syntax. It now builds the body with an array and `join('\n')`.
- The post used `terraform plan -refresh-only -json | jq '.resource_drift'`, but `terraform plan -json` emits the machine-readable UI event stream. The documented plan JSON format containing `resource_drift` is produced with `terraform show -json` against a saved plan file, so the example was corrected.
- The sensitive-data JSON filtering example used `terraform plan -refresh-only -json`, which has the same machine-readable UI issue. It now saves a refresh-only plan and filters the `terraform show -json` output.

## Review Notes
Terraform was not installed in the local workspace, so command validation was performed against official HashiCorp documentation instead of local `terraform --help` output. The targeted refresh examples are valid CLI usage, but Terraform's official guidance treats `-target` as an exceptional option rather than a routine workflow.
