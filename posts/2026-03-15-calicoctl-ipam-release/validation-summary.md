# Validation Summary: How to Use calicoctl ipam release with Practical Examples

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes
- kubectl
- Bash scripting

## Sources Consulted
- Calico Open Source documentation: calicoctl ipam release - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl datastore migrate lock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico Open Source documentation: calicoctl datastore migrate unlock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Project Calico source: calicoctl ipam release implementation - https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/ipam/release.go
- Project Calico source: calicoctl ipam check implementation - https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/ipam/check.go

## Issues Found
- The documented successful single-IP release output did not match current calicoctl behavior. Updated it to `Successfully released IP address 10.244.1.15`.
- The documented unassigned-IP output did not match current calicoctl behavior. Updated it to `IP address 10.244.1.15 is not assigned`.
- The multi-IP cleanup script parsed human-readable `calicoctl ipam check` output with `grep` and `awk`. Replaced it with Calico's documented report workflow using `calicoctl datastore migrate lock`, `calicoctl ipam check -o`, and `calicoctl ipam release --from-report`.
- The removed-node cleanup script also parsed non-stable `ipam check` output. Replaced it with the same report-based release flow after verifying the node is absent.
- The post used `calicoctl ipam show --show-blocks` to verify a specific IP. Changed this to `calicoctl ipam show --ip=<IP>`, which is the documented command for checking one address.
- The pod IP checks used broad `grep` matching, which can match partial IP strings. Updated examples to compare the pod IP column with `awk`.
- The expected clean `ipam check` output was not the current output from calicoctl. Updated it to `Check complete; found 0 problems.`
- The troubleshooting note about a locked IP block was not supported by the checked documentation or source. Replaced it with checks for datastore access, version compatibility, and report freshness.

## Review Notes
The post is technically relevant and valid after correction. Report-based release is safer for bulk cleanup than parsing CLI text because Calico validates report metadata, including cluster identity and freshness.
