# Validation Summary: Troubleshooting Errors in calicoctl ipam check

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes RBAC
- Bash

## Sources Consulted
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico documentation: calicoctl ipam release, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico documentation: configure calicoctl for Kubernetes API datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: configure calicoctl for etcd datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: Calico node RBAC examples, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Project Calico source: calicoctl IPAM check implementation, https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/ipam/check.go
- Project Calico source: calicoctl IPAM release implementation, https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/ipam/release.go

## Issues Found
- `calicoctl ipam release --node=<old-node-name>` is not a supported current option. The official command supports `--ip` and `--from-report`; the post now uses `calicoctl ipam check -o report.json` and `calicoctl ipam release --from-report=report.json`.
- Report-based release was shown without locking the datastore. The official workflow locks the datastore before generating the report and releases from that fresh report; the examples and script now include `calicoctl datastore migrate lock` and `unlock`.
- The RBAC example omitted Calico resources read by `ipam check`, including workload endpoints, cluster information, and kube controllers configuration, and listed pods even though the current checker reads Kubernetes services and Calico workload endpoints. The RBAC snippet was updated accordingly.
- The cleanup script attempted to parse node ownership from `calicoctl ipam show --show-blocks` and release by node, which does not match the documented output or supported release flags. The script now performs a supported report-based cleanup workflow.

## Review Notes
The guide is technically relevant and remains a valid troubleshooting guide after correction. Operators should still review generated IPAM reports before running cleanup in production, especially on busy clusters.
