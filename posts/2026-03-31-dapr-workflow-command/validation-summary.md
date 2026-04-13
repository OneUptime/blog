# Validation Summary: How to Use the dapr workflow Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr workflow` command)
- Dapr Workflow API (lifecycle management)
- Bash scripting (automation example)

## Sources Consulted
- Dapr CLI source code on GitHub (github.com/dapr/cli) — workflow subcommand implementations for `run`, `history`, `suspend`, `resume`, `terminate`, `purge`
- Dapr official documentation (docs.dapr.io) — workflow CLI reference

## Issues Found

1. **Incorrect output message for `dapr workflow run`**: The blog showed `Successfully started workflow. Instance ID: abc12345-...` but the actual CLI outputs `Workflow instance started successfully: abc12345-...`. Fixed the sample output to match the real CLI behavior.

2. **Missing `--output json` flag on `dapr workflow history`**: The blog showed JSON output from the `dapr workflow history` command but omitted the `--output json` flag. Without this flag, the default output format is `short` (tabular), not JSON. Added `--output json` to both the standalone example and the scripted automation section.

3. **Incorrect grep pattern in scripted automation**: The script used `grep "Instance ID"` to parse the output of `dapr workflow run`, but since the actual output message is `Workflow instance started successfully: <id>`, this grep would not match. Changed to `grep "successfully"` to correctly match the actual output.

## Review Notes
- The subcommand names (`run`, `history`, `suspend`, `resume`, `terminate`, `purge`) are all correct.
- The `--app-id` and `--input` flags are used correctly throughout.
- The `suspend` and `resume` commands also support a `--reason` / `-r` flag not mentioned in the post; this is optional and its omission is acceptable for an introductory tutorial.
- The `terminate` command supports an `--output` / `-o` flag for passing output data to the workflow, not mentioned in the post. Again, acceptable for scope.
- The post does not cover `dapr workflow list`, `dapr workflow raise-event`, or `dapr workflow rerun` subcommands, which is fine given the post's focused scope on core lifecycle operations.
