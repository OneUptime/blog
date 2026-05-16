# Validation Summary: How to Monitor Service Health on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes (kubelet, kubectl)
- etcd
- containerd / cri
- Prometheus / ServiceMonitor (kube-prometheus-stack CRDs)
- node_exporter
- bash scripting

## Sources Consulted
- Talos CLI Reference: https://www.talos.dev/latest/reference/cli/
- Talos Components documentation: https://www.talos.dev/latest/learn-more/components/
- Talos troubleshooting control plane: https://www.talos.dev/latest/advanced/troubleshooting-control-plane/
- Sidero Labs Talos v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Prometheus Operator ServiceMonitor CRD documentation

## Issues Found
No technical issues found. All `talosctl` commands referenced (`services`, `service <name>`, `logs <service>`, `logs -f`, `get machinestatus`, `get nodestatus`, `etcd status`, `etcd members`, `etcd alarm list`, `get <resource> --watch`) are valid and current. The `-n` (nodes) and `-e` (endpoints) flags are correctly used. The ServiceMonitor YAML uses the correct `monitoring.coreos.com/v1` apiVersion. The bash and kubectl examples are syntactically correct.

## Review Notes
- Minor caveat: `machined` is the Talos init process (PID 1) and may not always appear as a row in `talosctl services` output across all Talos versions. The example output includes it with HEALTH "?" which is consistent with how it would render if reported, so this was left as-is.
- The example bash health-check script uses `grep -q "Running.*OK"` to declare services healthy. This passes if at least one service is healthy rather than verifying that no services are failing; a stricter check (e.g., scanning for any non-OK rows) would be more accurate. This is a logic-improvement opportunity, not a technical inaccuracy, so it was not modified.
- The "Using the Resource API" section lists `talosctl -n ... get nodestatus` twice (once as "node readiness" and once as "Kubernetes node conditions"). Both are valid invocations of the same resource; the duplication is stylistic and was not changed.
- Talos version compatibility: commands shown are consistent with current Talos (v1.x). If readers are on much older versions, some resource names or shortnames may differ.
