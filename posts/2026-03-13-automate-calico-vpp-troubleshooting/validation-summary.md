# Validation Summary: How to Automate Calico VPP Troubleshooting

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico VPP dataplane
- FD.io VPP and `vppctl`
- Kubernetes Pods, CronJobs, ConfigMaps, and service accounts
- `kubectl exec`, `kubectl logs`, and JSONPath output
- Bash scripting

## Sources Consulted
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP generated manifest for v3.31.0: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- FD.io VPP CLI reference: https://s3-docs.fd.io/vpp/25.10/cli-reference/index.html

## Issues Found
- The scripts selected Calico VPP pods with `app=calico-vpp-node`, but the official Calico VPP manifest labels the DaemonSet and pod template with `k8s-app=calico-vpp-node`. Updated both scripts and the CronJob-mounted script to use `k8s-app=calico-vpp-node`.
- The diagnostic bundle attempted to collect logs from a `calico-vpp-manager` container. The official Calico VPP manifest defines `vpp` and `agent` containers, and the Calico documentation identifies the agent as responsible for runtime Calico VPP programming. Updated the log collection to use the `agent` container and write `agent-logs.txt`.
- The post description claimed the script collected trace logs and interface statistics, but the example collected VPP state, interface data, version output, NAT summary, and agent logs. Adjusted the description to match the actual script.
- The CronJob referenced `/scripts/check-calico-vpp-health.sh` in a `bitnami/kubectl` container without providing that script. Added a ConfigMap containing the script and mounted it into `/scripts` with executable permissions.

## Review Notes
The CronJob still assumes a `calico-vpp-monitor` service account with RBAC permissions to list/get pods, exec into the `vpp` container, and read logs if reused for diagnostics. The snippets were checked with `bash -n`, and the Kubernetes YAML parsed successfully with PyYAML; `kubectl` was not installed locally for server-side dry-run validation.
