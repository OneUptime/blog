# Validation Summary: How to Troubleshoot Controllers in Cilium Observability

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Cilium
- Cilium in-agent debug CLI (`cilium-dbg`)
- Cilium Kubernetes CLI (`cilium`)
- Kubernetes
- kubectl
- Helm
- Prometheus
- eBPF / BPF maps
- Python JSON parsing for CLI output

## Sources Consulted
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium API reference for controller status JSON fields: https://docs.cilium.io/en/stable/api.html
- Cilium metrics reference for controller metrics: https://docs.cilium.io/en/stable/observability/metrics.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf nat list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list.html
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium config set` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_set.html
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/

## Issues Found
- The post used `cilium status controllers -o json` inside Cilium pods. Current Cilium documentation exposes the in-agent CLI as `cilium-dbg`, and `status` uses `--all-controllers` rather than a `controllers` subcommand. Updated the affected commands to `cilium-dbg status --all-controllers -o json` and adjusted Python parsing to read the `controllers` field.
- The API server health check used `kubectl get componentstatuses` and `/healthz`. Kubernetes documents `/healthz` as deprecated since v1.16 and recommends `/livez` and `/readyz`. Replaced the check with `kubectl get --raw='/readyz?verbose'`.
- The BPF CT map command used `cilium bpf ct list global`, which does not match the current `cilium-dbg bpf ct list [cluster <identifier>]` reference. Updated it to `cilium-dbg bpf ct list`.
- Several in-pod endpoint and BPF commands used `cilium` instead of `cilium-dbg`. Updated them to the documented in-agent command names.
- The CRD section said the command would reinstall CRDs, but it used `--dry-run=server`, so it only validates rendered resources. Updated the wording to describe validation before reinstalling with Helm.
- The endpoint recovery example used `cilium endpoint regenerate`, which is not present in the current `cilium-dbg endpoint` command reference. Replaced it with recreating the affected workload pod to cause Cilium to create a new endpoint.
- The verification command used `cilium status --brief`, but the current external Cilium CLI `status` command does not document `--brief`; that flag belongs to `cilium-dbg status`. Updated it to `cilium status`.

## Review Notes
- The guide is technically relevant and contains actionable troubleshooting commands.
- The Prometheus query uses the common exported Cilium metric name `cilium_controllers_failing`; Cilium's metrics reference lists the controller metric as `controllers_failing`, with the Cilium namespace commonly appearing as the `cilium_` prefix in Prometheus.
- Some troubleshooting actions, especially deleting workload pods or restarting the Cilium DaemonSet, can be disruptive and should be run during an appropriate maintenance window in production clusters.
