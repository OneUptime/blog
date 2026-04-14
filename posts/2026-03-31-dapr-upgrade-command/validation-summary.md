# Validation Summary: How to Use the dapr upgrade Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr CLI (`dapr upgrade`, `dapr status`, `dapr init`, `dapr uninstall`)
- Kubernetes
- Helm (used internally by `dapr upgrade`)
- kubectl

## Sources Consulted
- Dapr CLI upgrade command reference: https://docs.dapr.io/reference/cli/dapr-upgrade/
- Dapr CLI source code (upgrade command): https://github.com/dapr/cli/blob/master/cmd/upgrade.go
- Dapr self-hosted upgrade documentation: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-upgrade/
- Dapr CLI status output struct: https://github.com/dapr/cli/blob/master/pkg/kubernetes/status.go

## Issues Found

### 1. False claim that `dapr upgrade` supports self-hosted mode
**What was wrong:** The post stated that `dapr upgrade` works for both Kubernetes and self-hosted mode, and showed `dapr upgrade --runtime-version 1.14.0` (without `--kubernetes`) as a self-hosted upgrade command. The `dapr upgrade` command is Kubernetes-only.
**What was changed:** Rewrote the Overview to clarify Kubernetes-only scope. Replaced the self-hosted section with the correct procedure: `dapr uninstall --all`, install new CLI, then `dapr init --runtime-version <version>`.

### 2. Non-existent `--wait` flag
**What was wrong:** The post used `--wait` as a flag for `dapr upgrade` in three places. This flag does not exist on the upgrade command. The `--timeout` flag (default 300 seconds) controls how long the CLI waits for the upgrade.
**What was changed:** Removed all uses of `--wait`. Renamed the "Waiting for the Upgrade to Complete" section to "Setting a Timeout for the Upgrade" and updated to use `--timeout` correctly.

### 3. Misleading "rolling upgrade" claim
**What was wrong:** The Overview stated the command "performs a rolling upgrade of all control plane pods." In reality, `dapr upgrade` delegates to Helm (`helm upgrade`), and the rolling update behavior comes from the Kubernetes deployment strategy, not from the Dapr CLI itself.
**What was changed:** Changed to "uses Helm under the hood to upgrade the control plane pods."

### 4. Incomplete `dapr status --kubernetes` output
**What was wrong:** The example output showed only 5 columns (NAME, NAMESPACE, HEALTHY, STATUS, VERSION). The actual output includes 8 columns: NAME, NAMESPACE, HEALTHY, STATUS, REPLICAS, VERSION, AGE, CREATED.
**What was changed:** Updated the example output to include all 8 columns.

### 5. Description meta field claimed self-hosted support
**What was wrong:** The Description line mentioned "in self-hosted mode."
**What was changed:** Updated to "on Kubernetes."

## Review Notes
- The `--image-registry` flag usage is correct and well-demonstrated for air-gapped environments.
- The `--runtime-version` flag is correctly used throughout.
- The kubectl backup commands for components and configurations are valid and useful advice.
- The rollback approach (using `dapr upgrade` with a previous version) is correct per the official docs.
- The `--timeout` default of 300 seconds is confirmed in the source code; the post originally passed `--timeout 300` which would have been redundant with the default.
