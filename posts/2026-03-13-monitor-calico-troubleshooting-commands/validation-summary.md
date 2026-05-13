# Validation Summary: How to Monitor Calico Using Standard Troubleshooting Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Kubernetes CronJob
- Bash
- kubectl
- Tigera Operator / TigeraStatus

## Sources Consulted
- Calico Open Source documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl node commands, https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico Open Source documentation: Install calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Tigera documentation: TigeraStatus, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico Cloud documentation: Tigera Operator troubleshooting checklist, https://docs.tigera.io/calico-cloud/get-started/operator-checklist
- Kubernetes documentation: CronJob, https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The description claimed the monitor detected BGP peer failures and policy count anomalies, but the implementation did not run `calicoctl node status` or inspect policy counts. Updated the description to match the implemented checks: operator health, pod failures, and IPAM exhaustion.
- The introduction said `calicoctl node status` was part of the three-check pattern, but the script and diagram did not include it. Updated the introduction to list the actual checks used in the post.
- The TigeraStatus check used `grep -v "Available"`, which does not correctly evaluate the documented `AVAILABLE`, `PROGRESSING`, and `DEGRADED` columns. Replaced it with an `awk` check for `AVAILABLE=True` and `DEGRADED=False`, and added error handling when the resource cannot be read.
- The pod health check only filtered out lines without `Running`, which missed readiness failures such as `0/1 Running`. Updated it to require both `STATUS=Running` and all containers ready.
- The IPAM parser searched for `IPs in use` and used the last field, but current `calicoctl ipam show` output is a table with an `IPS IN USE` column containing values like `5 (0%)`. Updated the parser to extract the highest IP Pool usage percentage from the documented table format.
- The CronJob used `bitnami/kubectl:latest`, which does not guarantee `calicoctl` is available, and it referenced `/scripts/calico-health-monitor.sh` without showing how the script is mounted. Updated the snippet to use a custom image containing both `kubectl` and a matching `calicoctl`, and added a ConfigMap volume mount for the script path.
- The conclusion referenced a diagnostic bundle script that was not included in the post. Replaced that reference with the command output produced by the health monitor.

## Review Notes
- The CronJob example still assumes a `calico-diagnostics` ServiceAccount, RBAC allowing reads of `tigerastatus` and pods, and a ConfigMap named `calico-health-monitor` containing the script. Those are deployment prerequisites rather than syntax errors in the snippet.
- Calico documentation recommends using a `calicoctl` version that matches the running Calico cluster version.
- `calicoctl node status` is valid for BGP status, but official documentation notes node subcommands must run directly on the compute host and do not work from a normal container without host filesystem access. It was therefore not kept as part of this CronJob-based monitor.
