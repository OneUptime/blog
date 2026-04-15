# Validation Summary: How to Configure Dapr Operator on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane / operator)
- Kubernetes (CRDs, RBAC, deployments)
- Helm (chart configuration)

## Sources Consulted
- Dapr Operator subchart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_operator/values.yaml
- Dapr Operator deployment template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_operator/templates/dapr_operator_deployment.yaml
- Dapr Operator source code (operator.go, api.go): https://github.com/dapr/dapr/blob/master/pkg/operator/operator.go
- Dapr Operator options (options.go): https://github.com/dapr/dapr/blob/master/cmd/operator/options/options.go
- Dapr control plane services overview: https://docs.dapr.io/concepts/dapr-services/operator/
- Dapr Kubernetes production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Component CRD definition: https://github.com/dapr/dapr/blob/master/charts/dapr/crds/components.yaml

## Issues Found

1. **Fabricated Helm values for watchdog feature**: The post used `watchdogEnabled`, `watchdogInterval`, and `watchdogMaxRestartsPerMin` as Helm values. None of these exist. The correct Helm values are `watchInterval` (to enable/configure the watchdog interval; minimum 1 second) and `maxPodRestartsPerMinute` (default: 20). There is no `watchdogEnabled` toggle — the watchdog is enabled by setting `watchInterval` to a positive duration. Fixed to use the correct key names and valid values.

2. **Invalid watchdog interval value**: The post specified `500ms` as the watchdog interval. The Dapr operator source code enforces a minimum of 1 second and fatally exits if a value below that is provided. Changed to `10s`.

3. **Incorrect watchdog description**: The post claimed the watchdog "monitors running Dapr sidecars and can restart those that become unresponsive." In reality, the watchdog periodically polls all pods and checks if pods annotated with `dapr.io/enabled=true` have a Dapr sidecar injected. If a sidecar is missing, it deletes the pod so Kubernetes recreates it with sidecar injection. It does not monitor sidecar responsiveness. Fixed the description.

4. **`nodeSelector`, `tolerations`, and `affinity` at wrong Helm scope**: The post placed these under the `dapr_operator` subchart key. In the actual Helm chart, `nodeSelector` and `tolerations` are configured at the `global` level (`global.nodeSelector`, `global.tolerations`). Affinity is hardcoded in the deployment template (OS node affinity plus pod anti-affinity in HA mode) and not user-configurable via a subchart value. Moved `nodeSelector` and `tolerations` to the `global` level and removed `affinity`.

5. **Incomplete CRD list**: The post listed Components, Configurations, Resiliency, and Subscriptions. The operator also watches HTTPEndpoints (and MCPServer in newer versions). Added HTTPEndpoints to the list.

6. **Fabricated event field selector**: The post used `--field-selector reason=ComponentUpdated` to filter Kubernetes events. There is no evidence the Dapr Operator emits events with reason `ComponentUpdated`. Replaced with a general `--sort-by='.lastTimestamp'` command to view recent events.

## Review Notes
- The RBAC section is general guidance and correct in approach, though the exact ClusterRole name may vary depending on the Dapr installation method and version.
- The `kubectl describe component statestore` command works because Kubernetes resolves the singular form `component` to the full CRD `components.dapr.io`. This is correct usage.
- The post could mention that setting `watchInterval` to `"0"` disables the watchdog entirely, but this is an enhancement rather than a correction.
