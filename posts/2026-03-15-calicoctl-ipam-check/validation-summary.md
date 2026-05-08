# Validation Summary: How to Use calicoctl ipam check with Practical Examples

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- Kubernetes CronJob
- kubectl

## Sources Consulted
- Tigera Calico Enterprise calicoctl ipam check reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Tigera Calico calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Tigera Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Project Calico v3.27.0 calicoctl source for ipam check output and report behavior: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/calicoctl/calicoctl/commands/ipam/check.go
- Local calicoctl v3.27.0 and v3.31.0 `ipam check --help`, `ipam release --help`, `ipam show --help`, and `get --help` output from official Project Calico release binaries.
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The original clean and problem-output examples did not match actual `calicoctl ipam check` output. Updated them to use the command's real wording, including "Checking IPAM for inconsistencies", the block/pool/node/workload/handle scan phases, and "Check complete; found N problems."
- The post described "orphaned allocations" and "block affinity issues" as direct report types. `ipam check` reports leaked allocations, in-use IPs outside active pools, in-use IPs missing IPAM allocations, leaked handles, and missing handles. Updated the terminology and removed the unsupported block-affinity claim.
- The CronJob alert condition searched for "inconsistencies", which appears in normal output and would alert on every run. Changed it to treat `Check complete; found 0 problems.` as the success condition and exit non-zero otherwise.
- The CronJob lacked datastore configuration for an in-cluster `calicoctl` run. Added `DATASTORE_TYPE=kubernetes` and noted that the `calico/ctl` image version should match the cluster version.
- The manual cleanup command tried to extract orphaned IPs by grepping for "orphaned", but actual problem IP output uses "leaked" lines. Replaced the manual parsing with the documented report workflow: `calicoctl ipam check --show-problem-ips -o ...` followed by `calicoctl ipam release --from-report=...`.
- The audit script used `calicoctl get workloadendpoints -A --no-headers`, but `calicoctl get` does not support `--no-headers`. Replaced it with `calicoctl get workloadendpoints -A | tail -n +2 | wc -l`.
- The pod verification command would always print the header line. Replaced it with a Kubernetes field-selector command that lists pods not in `Running` or `Succeeded` phase.

## Review Notes
- `calicoctl ipam release` does not remove an IP from an existing endpoint. Operators should only release addresses that are confirmed leaked or use a freshly generated report.
- The official Tigera command reference documents `ipam check` under Calico Enterprise, while official Project Calico release binaries for v3.27.0 and v3.31.0 include the command and help output.
