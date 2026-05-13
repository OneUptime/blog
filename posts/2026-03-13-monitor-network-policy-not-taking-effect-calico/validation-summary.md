# Validation Summary: How to Monitor Network Policy Not Taking Effect in Calico

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Calico (Felix component)
- Kubernetes NetworkPolicy
- Prometheus / PrometheusRule (Prometheus Operator)
- kubectl
- Kubernetes CronJob
- Mermaid (diagram)

## Sources Consulted
- [Calico Felix Prometheus metrics reference](https://docs.tigera.io/calico/latest/reference/felix/prometheus)
- [Calico FelixConfiguration resource reference](https://docs.tigera.io/calico/latest/reference/resources/felixconfig)
- [Monitor Calico component metrics](https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics)
- Calico CRD schema in projectcalico/calico GitHub repository

## Issues Found

1. **Incorrect PromQL expression for `felix_resync_state`** — The original expression `felix_resync_state{state!="in-sync"} > 0` assumed a `state` label. The actual `felix_resync_state` metric is a numeric gauge encoded as: 1='waiting for datastore', 2='resync in progress', 3='in sync with datastore'. Fixed by changing the expression to `felix_resync_state != 3` to detect any non-in-sync state. Also updated the alert summary to say "datastore sync" rather than "policy sync" because this metric reflects the datastore-dataplane sync state.

2. **Invalid FelixConfiguration field `policyDebugEnabled`** — There is no `policyDebugEnabled` field in the Calico `FelixConfiguration` spec. Open-source Calico does not have a flag that toggles "policy audit logging" globally; flow/audit logging is a Calico Enterprise feature, and per-rule logging in OSS is done with the `Log` action on individual policy rules. Replaced the patch with `logSeverityScreen: Debug`, which is a valid field that increases Felix log verbosity (including policy-related diagnostics) and aligns with the diagnostic intent of the section.

## Review Notes
- Felix's Prometheus endpoint defaults to TCP port 9091, which matches the post.
- The metric `felix_active_local_endpoints` is correct and is documented as a gauge of active workload+host endpoints on the node.
- The `kubectl exec` diagnosis command pipes `wget` output through `grep`. The standard `calico/node` image does include BusyBox `wget`, so this should work in current Calico releases, but this could break if Calico ever switches to a more stripped-down base image. Consider using `kubectl run --rm` with a `curlimages/curl` debug pod and `kubectl port-forward` for portability.
- The compliance CronJob uses `curl ... || echo "BLOCKED"` to capture the failure case. Note that this also returns "BLOCKED" for unrelated curl errors (DNS resolution failure, connection refused, etc.), which could cause false positives ("PASS" when the underlying service is simply down). For higher fidelity, check the curl exit code explicitly (e.g., `7` for connection refused, `28` for timeout — which is what a `DROP` policy would produce).
- `felix_resync_state` reflects connectivity to the datastore (Typha/etcd/Kubernetes API), not policy correctness per se. The alert is still useful because policies cannot be kept up to date if Felix is out of sync with the datastore, but operators should not interpret this metric as proof that policies are being correctly enforced — the compliance-check CronJob is the more direct signal.
