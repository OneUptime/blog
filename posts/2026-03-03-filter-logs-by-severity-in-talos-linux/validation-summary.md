# Validation Summary: How to Filter Logs by Severity in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl logs`, `talosctl dmesg`)
- Kubernetes components (kube-apiserver, controller-manager, scheduler, kubelet)
- klog (Kubernetes logging library)
- Grafana Loki / LogQL
- Elasticsearch / KQL
- Prometheus / PrometheusRule (kube-prometheus-stack CRD)
- jq, grep, bash scripting
- etcd

## Sources Consulted
- Talos CLI reference: https://www.talos.dev/v1.9/reference/cli/
- Talos logging guide: https://www.talos.dev/v1.9/talos-guides/configuration/logging/
- Talos v1alpha1 config reference: https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- klog source (severity prefixes): https://github.com/kubernetes/klog/blob/main/internal/severity/severity.go
- Loki LogQL log queries: https://grafana.com/docs/loki/latest/query/log_queries/
- etcd monitoring docs: https://etcd.io/docs/v3.4/op-guide/monitoring/ and PR https://github.com/etcd-io/etcd/pull/10156
- Kubelet metrics source: https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/metrics/metrics.go

## Issues Found

1. **`talosctl logs -o json` flag does not exist.** The post used `talosctl ... logs machined -o json | jq ...`. Per the official talosctl reference, the `logs` subcommand only accepts `-f/--follow`, `--tail`, `-k/--kubernetes` (plus global flags). There is no `-o`/`--output` flag, and the command would fail. Talos system services already emit JSON natively, so no flag is needed. **Fix:** removed `-o json` from the three example commands.

2. **Wrong JSON field name for Talos service logs.** The post filtered on `.level`. Talos service log entries use `talos-level` (along with `talos-service`, `talos-time`, `msg`). **Fix:** updated jq selectors to `.["talos-level"]`.

3. **Wrong severity level string.** The post used `"warning"`. Talos service logs use `"warn"` (slog/zerolog convention). **Fix:** changed `"warning"` to `"warn"`.

4. **Removed unsupported `"critical"` level.** Talos service loggers do not emit a "critical" level (the standard set is debug/info/warn/error/fatal). **Fix:** simplified the fatal example to only check for `"fatal"`.

5. **LogQL line-filter OR syntax was malformed.** The post used `|= "W0" or |= "warning"`. Loki's multi-value line filter is written as `|= "W0" or "warning"` — the operator is not repeated after `or`. **Fix:** removed the duplicated `|=`.

## Review Notes

- The Loki query `{source="talos-machine"} | json | talos_level="error"` is correct: Loki's `| json` parser sanitizes JSON keys containing hyphens by replacing them with underscores, so `talos-level` becomes the extractable label `talos_level`.
- The kube-apiserver JSON example (`jq 'select(.level == "error")'`) was left alone; whether a `level` field is present depends on the klog/structured-logging configuration the user enables, and the post explicitly hedges with "(as described in our JSON logging guide)".
- `etcd_server_health_failures` exists as a real metric (added in etcd 3.2 via PR #10156) but is not listed on the v3.5 stable metrics page. It works for alerting but is not part of the stability guarantee.
- klog single-character severity prefixes `I`/`W`/`E`/`F` are accurate (confirmed in klog source). The `^[EW]` and `^[EF]` grep patterns work because klog always begins each line with the severity character.
- The Talos machine config snippet (`cluster.apiServer.extraArgs.v`, `machine.kubelet.extraArgs.v`, etc.) was verified against the v1alpha1 schema; all four paths exist as `map[string]string`.
- The script and debugging workflow examples are sound; grep patterns and `talosctl --tail` usage all match the documented CLI.
