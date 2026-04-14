# Validation Summary: How to Use the dapr logs Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr CLI (`dapr logs` command)
- Kubernetes
- kubectl
- Dapr sidecar (daprd)

## Sources Consulted
- Dapr CLI reference documentation: https://docs.dapr.io/reference/cli/dapr-logs/
- Dapr CLI source code: `github.com/dapr/cli/cmd/logs.go` and `github.com/dapr/cli/pkg/kubernetes/logs.go`
- kubectl logs documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found

### Issue 1: Non-existent `--follow` flag
- **What was wrong:** The post used `dapr logs --app-id order-service --kubernetes --follow` and described `--follow` as a valid flag for streaming logs in real time. The `dapr logs` command does not support a `--follow` flag; the source code hardcodes `Follow: false` in PodLogOptions.
- **What was changed:** Replaced the command with `kubectl logs deployment/order-service -c daprd -n default --follow`, which correctly targets the Dapr sidecar container and supports the `--follow` flag. Added a note clarifying that `dapr logs` does not support streaming.

### Issue 2: Non-existent `--since` flag
- **What was wrong:** The post used `dapr logs --app-id order-service --kubernetes --since 30m` to filter logs by duration. The `--since` flag does not exist in the `dapr logs` command.
- **What was changed:** Replaced with `kubectl logs deployment/order-service -c daprd -n default --since=30m` and added a note that `dapr logs` does not support time-based filtering.

### Issue 3: Non-existent `--since-time` flag
- **What was wrong:** The post used `dapr logs --app-id order-service --kubernetes --since-time "2026-03-31T09:30:00Z"` to filter logs by timestamp. The `--since-time` flag does not exist in the `dapr logs` command.
- **What was changed:** Replaced with `kubectl logs deployment/order-service -c daprd -n default --since-time="2026-03-31T09:30:00Z"`.

### Issue 4: Summary referenced `--follow` as a `dapr logs` feature
- **What was wrong:** The summary paragraph said "Combine it with `--follow` for real-time log tailing" implying `--follow` is a `dapr logs` flag.
- **What was changed:** Updated to recommend `kubectl logs` with `--follow` targeting the `daprd` container for real-time tailing.

## Review Notes
- The `dapr logs` command only supports 4 functional flags: `--app-id` (`-a`), `--kubernetes` (`-k`), `--namespace` (`-n`), and `--pod-name` (`-p`). It is a relatively limited command compared to `kubectl logs`.
- The valid flags used in the post (`--app-id`, `--kubernetes`, `--namespace`, `--pod-name`) are all correct.
- The sample log output format is representative of real Dapr sidecar log output.
- The `--kubernetes` flag is marked as required in the CLI, which the post correctly uses in all `dapr logs` examples.
