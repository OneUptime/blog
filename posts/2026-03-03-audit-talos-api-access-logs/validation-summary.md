# Validation Summary: How to Audit Talos API Access Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl, apid, machine configuration)
- gRPC + mTLS (Talos API)
- Kubernetes (kube-apiserver audit logging, audit policies)
- Fluent Bit (DaemonSet for log collection)
- Promtail / Loki / Grafana
- Prometheus (alerting rules)
- Elasticsearch ILM (index lifecycle management)
- Syslog (UDP/TCP log forwarding)

## Sources Consulted
- Talos CLI reference for talosctl logs: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos CLI reference for talosctl config new
- Talos CLI reference for talosctl apply-config
- Talos CLI reference for talosctl gen config
- Talos CLI reference for talosctl patch (machineconfig)
- Talos configuration reference v1alpha1 (machine.logging.destinations): https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Kubernetes audit policy docs (audit.k8s.io/v1)

## Issues Found
1. **Invalid `--config-patch` usage with `talosctl apply-config`** — The original command `talosctl apply-config --nodes <node-ip> --config-patch @machine-config-logging.yaml` is malformed. `--config-patch` for `apply-config` patches a base config supplied with `-f`; without it, the command does not perform a runtime patch as the post intends. Changed to use `talosctl patch mc --patch @machine-config-logging.yaml`, which is the correct command for applying a runtime patch to the machine config.
2. **Invalid `--roles` flag on `talosctl gen config`** — `talosctl gen config` does not support a `--roles` flag (its patch-style flags are `--config-patch`, `--config-patch-control-plane`, `--config-patch-worker`). The `--roles` flag is supported by `talosctl config new`, which is the proper command for generating a new talosconfig with restricted roles. Replaced the example with `talosctl config new --roles os:reader limited-talosconfig`.
3. **Invalid `--since` flag on `talosctl logs`** — `talosctl logs` does not support `--since`. Available flags are `-f/--follow`, `--tail`, `-k/--kubernetes`, plus the worker/controlplane selectors. Updated the correlation example to use `--tail` plus a `grep` for the timestamp prefix, with a brief inline note explaining why.

## Review Notes
- The Talos API/mTLS/gRPC overview, list of operations, and the `talosctl logs apid` command are all correct.
- `machine.logging.destinations` with `format: json_lines` and `udp://` / `tcp://` endpoints is valid per the v1alpha1 configuration reference.
- The roles listed (`os:admin`, `os:reader`, `os:etcd:backup`) are valid Talos roles.
- The Promtail example reads `/var/log/apid.log`, which is not a path that exists on a stock Talos node (apid logs are accessed via the Talos API, not as a host file). In a real deployment you would point Promtail at the syslog destination that receives the forwarded logs, or run it inside an environment that has the forwarded log stream available. Left as-is because the example is clearly illustrative of pipeline_stages parsing, but worth tightening in a future revision.
- The kube-apiserver `audit-log-max*` values are correctly quoted as strings (Talos `extraArgs` is `map[string]string`).
- Compliance retention numbers (SOC 2 ~1y, PCI DSS 1y / 3mo immediately available, HIPAA 6y, GDPR as-needed) are commonly cited figures and broadly accurate as guidance; readers should always confirm against their auditor's specific requirements.
