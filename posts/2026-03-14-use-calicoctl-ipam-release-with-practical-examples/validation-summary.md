# Validation Summary: Using calicoctl ipam release with Practical Examples

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- Bash

## Sources Consulted
- Calico documentation: `calicoctl ipam release` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: `calicoctl ipam check` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: `calicoctl ipam show` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Kubernetes documentation: `kubectl run` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: `kubectl delete` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post used `calicoctl ipam release --node=old-worker-node`, but the documented `calicoctl ipam release` options are `--ip` and `--from-report`; there is no `--node` option. Replaced the example with the documented report-based workflow using `calicoctl ipam check -o report.json` and `calicoctl ipam release --from-report=report.json`.
- The batch release script parsed human-readable `calicoctl ipam check` output with `grep` to find leaked IPs. The official workflow supports writing a report with `ipam check -o` and releasing leaked addresses from that report with `ipam release --from-report`. Updated the script to use the documented report workflow and datastore lock/unlock steps.
- The removed-node script attempted to release all IPs for a node using the nonexistent `--node` option. Updated it to check IPAM consistency against Kubernetes after node removal and release leaked addresses from the generated report.

## Review Notes
- `calicoctl ipam release --ip`, `calicoctl ipam show --ip`, `calicoctl ipam show`, and `calicoctl ipam check` match the official Calico documentation.
- Calico's documented IPAM check workflow locks the datastore while generating and applying a report; the updated scripts follow that pattern. While locked, new pods cannot be launched until the datastore is unlocked.
