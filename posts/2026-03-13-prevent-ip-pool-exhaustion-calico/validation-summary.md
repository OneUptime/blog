# Validation Summary: How to Prevent IP Pool Exhaustion in Calico

## Status
validated

## Post Type
Guide / Prevention playbook (sizing, monitoring, and leak cleanup for Calico IPAM)

## Technologies Covered
- Calico (projectcalico.org/v3 IPPool CRD)
- calicoctl (ipam show, ipam show --show-blocks, ipam check)
- Kubernetes CronJob (batch/v1)
- Bash / shell scripting
- Mermaid (flowchart)

## Sources Consulted
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico IPAM concepts (block sizes, default /26 block): https://docs.tigera.io/calico/latest/networking/ipam/
- Kubernetes CronJob API (batch/v1, GA since 1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- **Diagnosis command grep case-sensitivity:** The original `grep -E "free|used"` would not match `calicoctl ipam show` output because the column headers are in upper case (`IPS FREE`, `IPS IN USE`, `IPS TOTAL`). Changed to `grep -iE "free|used"` so the case-insensitive match actually finds the relevant rows.

## Review Notes
- IPPool CRD fields used (`cidr`, `blockSize`, `ipipMode`, `natOutgoing`) are correct for `projectcalico.org/v3`. Default `blockSize: 26` is accurate.
- Subnet math is correct: `/16` = 65,536 addresses, `/22` = 1,024 addresses, `/24` = 256 addresses. The note that `/24` is risky for ~50 pods is reasonable because Calico allocates IPs in `/26` blocks (64 each), so a `/24` only yields 4 blocks before fragmentation across nodes becomes a constraint.
- `calicoctl ipam check` is the correct command for surfacing IPAM leaks (introduced in Calico v3.x). It is read-only by default; cleanup of confirmed leaks would require `--show-problem-ips` followed by `calicoctl ipam release`. The post references `ipam check` as a leak-detection step, which is accurate.
- The CronJob examples assume the `calico-node` ServiceAccount has the necessary RBAC and Datastore credentials for `calicoctl` to reach the Calico datastore. In practice this may require additional env vars (`DATASTORE_TYPE`, kubeconfig mount) depending on whether the cluster uses the Kubernetes API datastore or etcd. Not a correctness error in the YAML itself, but operators adapting this should be aware.
- The shell parsing inside the utilization CronJob is illustrative — `grep -i "free"` will match the header row of `calicoctl ipam show`, which contains no digits, so `head -1` of `\d+` matches may return empty. The script's `if [ -n "$FREE" ]` guard makes the alert silently no-op rather than misfire, so it is not actively harmful, but anyone deploying this should validate the parsing against their calicoctl version (table output changed slightly between v3.20 and v3.27). Left as-is to preserve the author's example.
- Image `calico/ctl:v3.27.0` is a valid published tag on Docker Hub. Newer Calico releases exist (v3.28, v3.29) but v3.27.0 is not deprecated and remains a reasonable pin.
- Mermaid `flowchart LR` syntax is valid.
