# Validation Summary: Using calicoctl ipam check with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico IPAM
- calicoctl
- Kubernetes
- Kubernetes CronJob
- Bash scripting

## Sources Consulted
- Calico Open Source documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source documentation: calicoctl ipam release, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Enterprise documentation: calicoctl ipam show, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Project Calico source: calicoctl ipam check implementation for v3.25.0, https://raw.githubusercontent.com/projectcalico/calico/v3.25.0/calicoctl/calicoctl/commands/ipam/check.go
- Project Calico source: calicoctl ipam check implementation for v3.32.0, https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/calicoctl/calicoctl/commands/ipam/check.go
- Project Calico source: calicoctl ipam release implementation for v3.32.0, https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/calicoctl/calicoctl/commands/ipam/release.go
- Kubernetes documentation: CronJob, https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Calico Enterprise documentation: BlockAffinity resource, https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity

## Issues Found
- The post described `calicoctl ipam check` as detecting orphaned blocks. Official documentation and source show it checks IPAM data structures against Kubernetes, reports leaked IPs, in-use IPs without IPAM allocations, leaked handles, and missing handles. Updated the description, introduction, troubleshooting, and conclusion to focus on leaked IPs, leaked handles, and IPAM consistency.
- The basic output example did not match real `calicoctl ipam check` output. Replaced it with output that follows the command's actual message structure from the Calico source.
- The leaked-IP grep example used plain `calicoctl ipam check`, but detailed leaked-IP lines are printed when problem IPs are requested. Updated it to use `calicoctl ipam check --show-problem-ips`.
- The block section used `calicoctl ipam check | grep "orphan"` and `calicoctl get nodes -o name`; `orphan` is not part of the documented `ipam check` output and `calicoctl get` does not document `-o name` as an output format. Reframed the section as block affinity inspection and used `kubectl get nodes -o name`.
- The audit script counted orphaned blocks from `ipam check` output and recommended bare `calicoctl ipam release`. Updated the script to check problem IP output and recommend report-based release.
- The troubleshooting section recommended unsupported `calicoctl ipam release --node=<old-node>`. Replaced it with report-based release for leaked IPs and manual verification guidance for unexpected block affinities.

## Review Notes
The CronJob manifest is syntactically valid for `batch/v1`, but a production deployment still needs an appropriate ServiceAccount, RBAC permissions, and calicoctl datastore configuration for the target cluster.
