# Validation Summary: How to Operationalize Calico IPAM Release Workflows

## Status
validated

## Post Type
Operational guide / runbook

## Technologies Covered
- Calico (calicoctl IPAM subcommands)
- Kubernetes (kubectl pod/endpoint queries)
- Bash scripting
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check

## Issues Found
- **Post-release verification command was misleading.** The original snippet used `calicoctl ipam show | grep "${IP}"` with the comment "Should show no output". This is not a meaningful verification: by default, `calicoctl ipam show` only prints IP pool summaries (totals/used/free), not individual IP addresses. Grepping for a specific IP would always return no output regardless of whether the release succeeded — giving a false sense of safety. Replaced with `calicoctl ipam show --ip="${IP}"`, which is the documented way to query the allocation state of a specific IP and will report whether the address is still assigned.

## Review Notes
- The `calicoctl ipam check` and `calicoctl ipam release --ip=<IP>` commands and flag syntax match the current Calico documentation.
- The comment `# After - should still show "consistent"` in the Best Practices block is advisory rather than literal — `calicoctl ipam check` output reports leak counts and per-pool stats rather than emitting the single word "consistent", but the intent (the run should still report a clean/healthy state) is correct and the wording is in a comment so I left it as-is.
- The `kubectl get pod --all-namespaces -o wide | grep "${ip}"` verification is a reasonable sanity check but is substring-based, so an IP like `10.0.0.1` would also match `10.0.0.10`, `10.0.0.11`, etc. For production scripts, an exact-match approach (e.g., piping through `awk` to compare the IP column) would be safer, but this is a hardening note rather than a technical error.
