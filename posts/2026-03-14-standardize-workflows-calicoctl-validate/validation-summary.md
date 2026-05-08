# Validation Summary: How to Standardize Team Workflows Around calicoctl validate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes / Calico resource YAML
- pre-commit
- GitHub Actions
- GitHub branch protection status checks
- Bash scripting
- Python YAML parsing
- Mermaid diagrams

## Sources Consulted
- Calico Open Source documentation: calicoctl validate, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source documentation: calicoctl user reference, https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source documentation: NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: GlobalNetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Official Project Calico release binaries for calicoctl v3.27.0, v3.31.0, and v3.32.0, https://github.com/projectcalico/calico/releases
- pre-commit official documentation, https://pre-commit.com/
- GitHub Actions workflow syntax documentation, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub REST API documentation for branches and branch protection data, https://docs.github.com/en/rest/branches/branches
- GNU Bash Reference Manual: command execution environment, command substitution, and set builtin, https://www.gnu.org/software/bash/manual/bash.html

## Issues Found
- The prerequisites and GitHub Actions install step used calicoctl v3.27.0, but the v3.27.0 binary does not include the `validate` subcommand. Updated the requirement to calicoctl v3.31 or later and changed the CI download URL to v3.31.0.
- The pre-commit `files` regex matched only paths beginning with `calico...yaml`, so the documented test file `calico-resources/test.yaml` would not trigger the hook. Updated the regex to target YAML files under `calico-resources/`.
- The GitHub Actions validation loop used `for file in $(find ...)`, which breaks on file names containing spaces. Replaced it with a `while IFS= read -r file` loop.
- The extended validation Python one-liners interpolated `$RESOURCE_FILE` directly into Python source, which can break for paths containing quotes. Exported `RESOURCE_FILE` and read it from `os.environ` inside Python.
- The validation metrics script incremented counters inside a pipeline subshell, so totals could remain zero after the loop. Replaced the pipeline with process substitution so counters update in the main shell.
- The validation metrics script used `output=$(calicoctl validate ...)` as a standalone command under `set -e`, causing the script to exit before counting invalid files. Moved the assignment into the `if` condition.
- The validation metrics script divided by `$TOTAL` without handling an empty resource directory. Added a zero-file guard that reports a pass rate of `0`.
- The final verification loop used `read` without `-r`, which can mangle backslashes in file names. Updated it to `while IFS= read -r f`.

## Review Notes
- The current `calicoctl validate` command validates files offline and supports `-f/--filename`, `--recursive`, and `--skip-empty`; the post's direct file validation usage is correct after the version fix.
- The policy order range check is a team-specific convention, not a Calico-defined valid range. The post presents it as extended business logic, which is appropriate.
