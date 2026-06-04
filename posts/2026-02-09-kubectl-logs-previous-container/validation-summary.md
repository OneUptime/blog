# Validation Summary: How to Use kubectl logs with Previous Container Logs After Crashes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Bash
- jq
- JSONPath

## Sources Consulted
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The command `kubectl get pods --field-selector=status.containerStatuses[*].restartCount!=0` used an unsupported Pod field selector. Kubernetes documents the supported Pod field selectors, and `status.containerStatuses[*].restartCount` is not one of them. Replaced it with a `kubectl get pods -o json | jq ...` command that filters pods by container restart count client-side.
- The comment `Follow previous logs (if container still exists)` was misleading because the command used `--tail=100`, not `--follow`/`-f`. Changed the comment to `Tail previous logs`.

## Review Notes
The `kubectl logs --previous` / `-p`, `--tail`, `--timestamps`, `--since`, `--since-time`, namespace, and container-selection examples match the official `kubectl logs` reference. Kubernetes logging documentation confirms that kubelet keeps one terminated container and its logs by default after a restart, with normal caveats around log rotation and lifecycle.
