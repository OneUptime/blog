# Validation Summary: How to Optimize Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Calico (Felix, Typha)
- Kubernetes (Deployments, DaemonSets, PriorityClass, Services)
- `kubectl` / `calicoctl`
- Prometheus metrics

## Sources Consulted
- Calico Felix configuration source (`felix/config/config_params.go`): https://github.com/projectcalico/calico/blob/master/felix/config/config_params.go
- Calico Typha configuration source (`typha/pkg/config/config_params.go`): https://github.com/projectcalico/calico/blob/master/typha/pkg/config/config_params.go
- Calico Typha sync server (`typha/pkg/syncserver/sync_server.go`): https://github.com/projectcalico/calico/blob/master/typha/pkg/syncserver/sync_server.go
- Calico Typha k8s rebalancer (`typha/pkg/k8s/rebalance.go`): https://github.com/projectcalico/calico/blob/master/typha/pkg/k8s/rebalance.go
- Calico Typha daemon (`typha/pkg/daemon/daemon.go`): https://github.com/projectcalico/calico/blob/master/typha/pkg/daemon/daemon.go
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource API: https://github.com/projectcalico/calico/blob/master/api/pkg/apis/projectcalico/v3/felixconfig.go
- Kubernetes scheduling types (`pkg/apis/scheduling/types.go`): https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/scheduling/types.go
- Kubernetes PriorityClass validation: https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/scheduling/validation/validation.go

## Issues Found

### 1. Step 1 — `typhaReadTimeout` cannot be patched via `FelixConfiguration`
**Before:** `calicoctl patch felixconfiguration default --patch '{"spec":{"typhaReadTimeout": 15}}'`

In Felix's `config_params.go`, `TyphaReadTimeout` is declared with `config:"seconds;30;local"`. The `local` flag means the parameter is only loaded from local sources (config file or environment variables) and is explicitly ignored if sourced from the datastore (`FelixConfiguration`). The field is also not present in the `FelixConfigurationSpec` CRD schema in `projectcalico/calico/api/pkg/apis/projectcalico/v3/felixconfig.go`. The patch command would therefore not affect Felix's behavior.

**After:** Switched to `kubectl set env daemonset/calico-node -n calico-system FELIX_TYPHAREADTIMEOUT=15`, which is the documented mechanism. Also clarified that the value format is a floating-point number of seconds (per Felix's `SecondsParam.Parse`).

### 2. Steps 2 & 3 — `TYPHA_CONNECTIONREBALANCINGMODE=auto` is invalid
**Before:** `TYPHA_CONNECTIONREBALANCINGMODE=auto`

In Typha's `config_params.go`, `ConnectionRebalancingMode` is declared with `config:"oneof(none,kubernetes);none"`. The only valid values are `none` (default) or `kubernetes`. There is no `auto` mode; setting it would cause Typha to fail config validation.

**After:** Changed both occurrences to `kubernetes`. Rewrote the explanation in Step 3 to describe how `kubernetes` mode actually works (polls the Kubernetes API for the number of Typhas and nodes via `PollK8sForConnectionLimit` in `typha/pkg/k8s/rebalance.go`, recomputes a per-replica max-connections cap, and drops excess connections — throttled by `ShutdownConnectionDropIntervalMaxSecs`).

### 3. Step 2 — Incorrect description of `TYPHA_MAXCONNECTIONSLOWERLIMIT`
**Before:** "The lower limit slows the initial connection rate, preventing Typha from being overwhelmed by simultaneous snapshot requests."

`MaxConnectionsLowerLimit` does not throttle initial connections. Per `CalculateMaxConnLimit` in `typha/pkg/k8s/rebalance.go`, it is the floor for the dynamic per-replica connection cap computed by the Kubernetes rebalancer. It only takes effect when `ConnectionRebalancingMode=kubernetes`.

**After:** Renamed the step to "Bound Per-Replica Connection Counts to Avoid Hotspots" and corrected the description. Also raised the example value from `10` to `200` — a value of `10` is technically valid but too aggressive (it would cap every Typha at 10 connections, which would force most Felix clients to be dropped in any non-trivial cluster).

### 4. Step 4 — Grep pattern does not match any Typha metric
**Before:** `curl -s http://localhost:9093/metrics | grep typha_snapshot`

Typha's snapshot send time metric is exposed as `typha_client_snapshot_send_secs` (see `summarySnapshotSendTime` registration in `typha/pkg/syncserver/sync_server.go`). The substring `typha_snapshot` does not appear in this metric name (it is `typha_client_snapshot...`), so the grep returns nothing.

**After:** Changed the grep pattern to `typha_client_snapshot_send_secs`.

### 5. Step 5 — PriorityClass value is invalid for a user-defined class
**Before:** `value: 2000000000  # Just below system-cluster-critical`

Two problems:
1. `2000000000` is not "just below" `system-cluster-critical` — it is the exact value of `SystemCriticalPriority` (`2 * HighestUserDefinablePriority` in `pkg/apis/scheduling/types.go`), which is what both `system-cluster-critical` and `system-node-critical` use.
2. More importantly, Kubernetes API-server validation in `pkg/apis/scheduling/validation/validation.go` rejects any user-defined PriorityClass whose `value` exceeds `HighestUserDefinablePriority` (`1000000000`) with: *"maximum allowed value of a user defined priority is 1000000000"*. So `kubectl apply` would fail with a validation error.

**After:** Lowered the value to `1000000000` (the maximum allowed for a user-defined PriorityClass) and updated the comment to be accurate.

### 6. Conclusion — Reference to non-existent "auto rebalancing"
**Before:** "balancing connections after recovery (auto rebalancing)"

**After:** Changed to "Kubernetes-mode rebalancing" to match the corrected configuration. Also adjusted the wording about Step 2 since it no longer describes startup staggering.

## Review Notes

- The post claims a "Calico Hard Way" install but uses the `calico-system` namespace throughout — that namespace is typically created by the Tigera operator install, while a true "hard way" install conventionally places components in `kube-system`. This is a naming/conventions mismatch rather than a technical error, so it was left untouched.
- Step 7 (`terminationGracePeriodSeconds: 30`) is technically valid but somewhat misleading: Typha's internal `ShutdownTimeoutSecs` default is 300s, so within a 30s grace period Typha will only complete a small fraction of its intended graceful drain before SIGKILL. Users tuning grace period should also set `TYPHA_SHUTDOWNTIMEOUTSECS` to roughly match. This could be added as a follow-up but is outside the scope of "fix errors only".
- Step 2's example value for `TYPHA_MAXCONNECTIONSLOWERLIMIT` was raised from `10` to `200` for safety; the original `10` would not generate a config-validation error (min is 1) but would be operationally harmful in a real cluster.
- The Typha metrics endpoint port (`9093`) was verified against `typha/pkg/config/config_params.go` (`PrometheusMetricsPort` default).
- The `typha_connections_active` metric in Step 6 was verified — this metric name is correct (registered as `gaugeNumConnections` in `sync_server.go`).
