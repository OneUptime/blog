# Validation Summary: How to List All Workspaces in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform (mentioned in tags as a related/equivalent tool)
- Bash shell scripting (`grep`, `awk`, `sed`, `tr`)
- S3 remote backend (briefly mentioned)

## Sources Consulted
- OpenTofu official docs: https://opentofu.org/docs/cli/commands/workspace/list/
- OpenTofu official docs: https://opentofu.org/docs/cli/commands/workspace/new/
- OpenTofu official docs: https://opentofu.org/docs/cli/commands/workspace/
- Terraform/OpenTofu CLI behavior for `workspace new` (which creates AND switches to the new workspace)

## Issues Found

1. **Incorrect active workspace in "Listing After Creating Multiple Workspaces" example.**
   The example showed `* staging` as the active workspace after running `tofu workspace new development`, `tofu workspace new staging`, then `tofu workspace new production` in sequence. However, `tofu workspace new <name>` both creates and switches to the new workspace, so after the final command the active workspace is `production`, not `staging`.
   - Fix: Changed the example output to show `* production` as the active workspace, with the alphabetically sorted entries `default`, `development`, `* production`, `staging`. Added a clarifying sentence noting that `tofu workspace new` creates and switches to the new workspace.

## Review Notes

- The basic output format (`  default`, `* staging`, `  production`) with two-space indentation and `* ` prefix for the active workspace matches actual OpenTofu output.
- The note that `tofu workspace list` does not support a `-json` flag is correct as of current OpenTofu versions (1.6–1.9).
- The claim that workspaces are listed alphabetically is consistent with OpenTofu's internal sorting behavior (workspaces are sorted before being printed). The official docs do not explicitly call this out, but it is observable behavior.
- The shell scripts (`grep '^\*' | awk '{print $2}'`, `sed 's/^\*//' | tr -d ' '`, `grep -q "^[* ]*production$"`) all work correctly against the actual command output format.
- The claim that the `default` workspace cannot be deleted is correct — OpenTofu (like Terraform) does not allow deletion of the default workspace.
- Minor non-blocking observation: the JSON output snippet `tofu workspace list -json 2>/dev/null || tofu workspace list` is fine as defensive code, but the immediately following note already explains that `-json` is not supported, so the snippet is essentially equivalent to just `tofu workspace list`. Left as-is since the post explains this clearly.
