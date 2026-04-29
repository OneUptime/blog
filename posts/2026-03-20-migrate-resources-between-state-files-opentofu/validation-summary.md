# Validation Summary: How to Migrate Resources Between State Files in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform-compatible state management
- HCL `moved` blocks for refactoring
- Bash scripting for batch state migration
- AWS resources used as illustrative examples (VPC, subnets, NAT gateways, route tables)

## Sources Consulted
- OpenTofu `state mv` command reference: https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu state management overview: https://opentofu.org/docs/language/state/
- OpenTofu refactoring / `moved` blocks: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu CLI global flags (`-chdir`): https://opentofu.org/docs/cli/commands/
- Terraform `plan` command behavior reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv

## Issues Found

1. **Path inconsistency in the first `tofu state mv` walkthrough.** Steps 1 and 2 used `-chdir=old-stack`, while step 3 used a different path (`environments/prod/terraform.tfstate`) for the same source state. This would confuse a reader following the example. I unified the paths so all three steps reference `environments/prod`. I also tightened the wording of the step-2 comment ("makes a backup and enables manipulation" → "to keep a backup before manipulating it"), since `tofu state pull` itself does not "enable manipulation" — the subsequent `state mv` operates on the on-disk state files via `-state`/`-state-out`.

2. **Incorrect plan-output expectation in the Safe Migration Checklist.** Step 5 originally said: "Verify the source stack plan shows destroy for migrated resources." This is technically incorrect. After `tofu state mv` removes a resource from the source state while the HCL configuration in the source still declares it, OpenTofu compares the (now empty for that resource) state to the HCL and plans to **create** the resource — not destroy it. Applying that plan would actually duplicate real infrastructure. A "destroy" plan would only appear if the HCL were removed without doing the state move (the opposite scenario). I rewrote the checklist around step 5–7 to:
   - Verify the destination plan shows "No changes" after migration (the correct success signal),
   - Warn that source HCL must be removed before applying source, with a brief explanation,
   - Confirm the source plan shows "No changes" after HCL cleanup, then apply if needed.

   This now matches the workflow described in the post's own conclusion ("update HCL in the destination stack first, move state second, remove HCL from source third, apply source to confirm").

## Review Notes
- The `tofu state mv -state=SOURCE -state-out=DEST RESOURCE NEW_ADDRESS` syntax is valid in OpenTofu. Per official docs, the `-state` and `-state-out` flags are supported for local-backend workflows; users on remote backends (S3, GCS, Terraform Cloud, etc.) should `state pull` to local files, run `state mv` against those files, and `state push` the results back. The post's example implicitly assumes local state, which matches the `-state`/`-state-out` flags shown.
- The `moved` block examples are syntactically and semantically correct for both same-state-file refactors and resource-into-module moves. Worth noting (not corrected in the post, since it is accurate as written) that `moved` blocks only handle moves *within a single state file*; they cannot move resources across state files — that still requires `state mv`. The post correctly distinguishes these two use cases.
- The Safe Migration Checklist is rendered inside an ```hcl``` fence even though its contents are a Markdown checklist, not HCL. This is a stylistic / Markdown rendering quirk rather than a technical error, so I left it alone per the "fix only technical issues" instruction.
- The bash batch-migration script properly quotes resource addresses with `"$resource"`, which is required so that bracketed indices like `aws_subnet.public[0]` are not glob-expanded by the shell. This is correct.
