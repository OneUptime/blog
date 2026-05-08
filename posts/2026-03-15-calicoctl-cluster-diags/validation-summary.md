# Validation Summary: How to Use calicoctl cluster diags with Practical Examples

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- Kubernetes CronJob
- kubectl
- Calico Felix and BGP logging

## Sources Consulted
- Calico Open Source calicoctl cluster diags documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico Open Source component logs documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico Open Source troubleshooting and diagnostics documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Project Calico v3.32.0 calicoctl cluster diags implementation: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/calicoctl/calicoctl/commands/cluster/diags.go
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post described an invented diagnostics output and bundle layout with paths such as `nodes/node-status.json`, `bgp/peers.json`, `ipam/pools.json`, and top-level `bgp/`, `ipam/`, `policies/`, `logs/`, and `config/` directories. Updated the examples to match the current calicoctl implementation, which creates a timestamped `calico-diagnostics-YYYYMMDD_HHMMSS.tar.gz` archive containing directories such as `cluster/`, `nodes/`, `links/`, and `tls/`, with Kubernetes resources under `cluster/kubernetes/` and Calico resources under `cluster/crd/`.
- The post claimed `CALICO_LOG_LEVEL=debug calicoctl cluster diags` collects debug-level logs from Felix, BIRD, and confd. Replaced this with guidance to adjust component log settings before running diagnostics, using Felix `logSeverityScreen` and noting that BGP agent logging is configured through BGP configuration.
- The CronJob example used `calico/ctl:v3.27.0`, but `calicoctl cluster diags` is documented and implemented in current Calico versions and was not present in the v3.27.0 calicoctl command tree. Updated the image to `calico/ctl:v3.32.0`.
- The CronJob example implied it could run without mentioning required cluster permissions. Added a short prerequisite note and `serviceAccountName` to make the example accurate in context.
- The troubleshooting note assumed the Calico namespace is always `calico-system`. Updated it to mention `kube-system` for manifest-based installs.

## Review Notes
The command and flags `calicoctl cluster diags`, `--since`, `--focus-nodes`, and `--max-logs` are valid in current Calico documentation. The exact set of files in the bundle can vary by Calico installation, enabled components, and datastore/API mode.
