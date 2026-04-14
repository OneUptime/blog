# Validation Summary: How to Perform a Rolling Dapr Upgrade on Kubernetes

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (kubectl, deployments, statefulsets, pods)
- Helm (chart upgrades, --atomic flag, --version flag)
- Bash scripting
- jq (JSON processing)

## Sources Consulted
- Dapr official documentation on Kubernetes annotations for sidecar injection (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/)
- Dapr Helm chart values.yaml on GitHub (https://github.com/dapr/dapr/tree/master/charts/dapr)
- Dapr upgrade documentation (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/#upgrading-dapr)
- Kubernetes documentation on label selectors vs annotations (https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/)
- Helm documentation for `upgrade`, `--atomic`, and `--timeout` flags (https://helm.sh/docs/helm/helm_upgrade/)

## Issues Found

### Issue 1: `dapr.io/enabled` used as a label selector (Steps 3 and 4)
- **What was wrong:** The scripts used `kubectl get deployments -l dapr.io/enabled=true` and `kubectl get pods -l dapr.io/enabled=true` to find Dapr-enabled workloads. However, `dapr.io/enabled` is a Kubernetes **annotation** on the pod template, not a label. The `-l` flag only filters by labels, so these commands would return zero results, silently skipping all Dapr-enabled workloads.
- **What was changed:** In Step 3, replaced the label selector with a `jq` filter that checks the deployment's pod template annotations: `jq -r '.items[] | select(.spec.template.metadata.annotations["dapr.io/enabled"] == "true") | .metadata.name'`. In Step 4, replaced the label selector with a `jq` filter that counts pods containing the `daprd` sidecar container: `jq '[.items[] | select(.spec.containers[].name == "daprd")] | length'`.
- **Why:** Using annotation-aware filtering or container name detection ensures the scripts actually find Dapr-enabled workloads correctly.

### Issue 2: `dapr_operator.watchInterval=10s` Helm value (Step 2)
- **What was wrong:** The Helm upgrade command included `--set dapr_operator.watchInterval=10s`. While `dapr_operator.watchInterval` is a valid Helm chart parameter, its default value is `"0"` which enables real-time streaming/watch mode. Setting it to `10s` switches the operator to polling mode with a 10-second interval, which is a performance degradation and not beneficial during an upgrade.
- **What was changed:** Removed the `--set dapr_operator.watchInterval=10s` line from the Helm upgrade command.
- **Why:** The default watch mode is more efficient and there's no reason to switch to polling during an upgrade.

## Review Notes
- The hardcoded version `"1.14"` in the Step 4 monitoring script's `jq` filter (`test("1.14")`) should ideally be parameterized to match `TARGET_VERSION`, but this is a usability concern rather than a correctness issue since the script is meant to be customized per upgrade.
- The overall upgrade strategy (control plane first, then rolling pod restarts) is correct and aligns with Dapr's official upgrade guidance.
- The use of `--atomic` on the Helm upgrade is a good practice that the post correctly highlights.
- The backward compatibility claim (control plane N with sidecar N-1) is accurate per Dapr's compatibility guarantees.
