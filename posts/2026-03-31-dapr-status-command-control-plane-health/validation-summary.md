# Validation Summary: How to Use the dapr status Command for Control Plane Health

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr CLI (`dapr status`, `dapr upgrade`)
- Kubernetes
- Bash scripting (CI/CD pipeline example)
- kubectl

## Sources Consulted
- Dapr CLI Reference — dapr status: https://docs.dapr.io/reference/cli/dapr-status/
- Dapr CLI Reference — dapr upgrade: https://docs.dapr.io/reference/cli/dapr-upgrade/
- Dapr CLI source code (`cmd/status.go`, `pkg/kubernetes/status.go`) for flag and output format verification

## Issues Found

### Issue 1: Non-existent `--namespace` flag on `dapr status`
- **What was wrong:** The post included a section "Checking a Custom Namespace" with the command `dapr status --kubernetes --namespace my-dapr-system`. The `--namespace` flag does not exist on the `dapr status` command. The command only supports `--kubernetes` (`-k`) and `--help` (`-h`).
- **What was changed:** Replaced the section with an explanation that `dapr status -k` automatically discovers Dapr components across all namespaces without needing a namespace flag.
- **Why:** The `dapr status` command internally queries pods across all namespaces and reports whichever namespace Dapr is installed in. Providing a non-existent flag would cause a CLI error.

### Issue 2: Non-existent `--output json` flag on `dapr status`
- **What was wrong:** The post included a "JSON Output" section showing `dapr status --kubernetes --output json` and a fabricated JSON output example. The `--output` flag does not exist on `dapr status`. The command always outputs a text table. (The `--output` flag exists on `dapr list`, not `dapr status`.)
- **What was changed:** Replaced the section with a note explaining that the command outputs a text table with no built-in JSON mode.
- **Why:** Running the command with `--output json` would produce a CLI error.

### Issue 3: Pipeline script relied on non-existent JSON output
- **What was wrong:** The deployment pipeline script used `dapr status --kubernetes --output json` and parsed the result with `jq`. Since there is no JSON output mode, this script would fail entirely.
- **What was changed:** Rewrote the script to parse the text table output using `tail` and `awk` to check the HEALTHY column for non-"True" values.
- **Why:** The original script was non-functional due to the non-existent `--output json` flag.

### Issue 4: Summary paragraph referenced JSON output
- **What was wrong:** The closing summary stated "Its JSON output integrates cleanly into CI/CD pipelines."
- **What was changed:** Changed to "Its tabular output can be parsed in CI/CD pipelines."
- **Why:** Consistency with the corrected content above.

## Review Notes
- The `dapr upgrade` command syntax (`dapr upgrade --kubernetes --runtime-version 1.14.0`) is correct per official docs.
- The listed control plane components (dapr-dashboard, dapr-operator, dapr-placement-server, dapr-sentry, dapr-sidecar-injector, dapr-scheduler-server) are accurate for Dapr 1.13+. Older clusters may also show `dapr-placement` (kept for backward compatibility).
- The `kubectl` diagnostic commands using `-l app=dapr-sentry` label selectors are correct.
- The sample output table columns (NAME, NAMESPACE, HEALTHY, STATUS, REPLICAS, VERSION, AGE) match the Dapr CLI source code's `StatusOutput` struct.
