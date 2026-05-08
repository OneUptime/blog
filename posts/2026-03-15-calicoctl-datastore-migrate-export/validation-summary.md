# Validation Summary: How to Use calicoctl datastore migrate export with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- etcdv3 datastore
- Kubernetes API datastore
- Calico datastore migration
- Calico resource validation
- Bash backup scripts

## Sources Consulted
- Calico documentation: `calicoctl datastore migrate export` - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: `calicoctl datastore migrate` overview - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: datastore migration from etcdv3 to Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: `calicoctl datastore migrate lock` - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: `calicoctl datastore migrate unlock` - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Calico documentation: configure `calicoctl` for etcd - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: configure `calicoctl` overview - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: `calicoctl get` - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: `calicoctl validate` - https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: `calicoctl node status` - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: `calicoctl ipam` overview - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview

## Issues Found
- The post described `calicoctl datastore migrate export` as exporting from the current datastore and supporting migration in either direction. Official Calico documentation defines the command as exporting the contents of an etcdv3 datastore for import into the Kubernetes datastore. Updated the introduction, prerequisites, examples, and conclusion to state the etcdv3-to-Kubernetes direction accurately.
- The post included a Kubernetes API datastore export example using `DATASTORE_TYPE=kubernetes`. This is not supported by the datastore migration export command, so it was replaced with a supported `--config` example.
- The exported resource list omitted several documented resource types and included IPAM allocations, which are not listed as an exported resource type in the official command reference. Updated the list to match documented resources.
- The migration workflow described `lock` as preventing changes during migration. Official documentation says the lock prevents new Calico resources from affecting the cluster but does not prevent creating or updating resources. Updated the wording and added the missing `unlock` command.
- The checklist used `calicoctl ipam check`, which is not part of the current Calico Open Source `calicoctl ipam` command set. Replaced it with `calicoctl ipam show --show-blocks` and adjusted the label to IPAM usage.
- The verification commands used `--no-headers`, which is not documented for `calicoctl get`, and abbreviated resource names `gnp` and `np`. Replaced them with documented full resource names and `go-template` output.
- Added `calicoctl validate -f calico-export.yaml` as a Calico-aware validation step, matching the official `validate` command documentation.
- Removed the unsupported `ETCD_DIAL_TIMEOUT` troubleshooting recommendation because it is not listed in current official `calicoctl` etcd configuration options.

## Review Notes
The backup examples are technically usable for etcd-backed Calico data, but operators should still coordinate backups with a stable cluster state or the documented migration lock workflow when consistency during active changes matters.
