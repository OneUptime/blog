# Validation Summary: Using calicoctl datastore migrate import with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico datastore migration
- etcdv3 datastore
- Kubernetes API datastore
- Bash shell commands

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore, https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate import, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: calicoctl datastore migrate export, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: calicoctl datastore migrate, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl delete, https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Configure calicoctl to connect to an etcd datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd

## Issues Found
- The post described `calicoctl datastore migrate import` as a general command for moving data between datastore types. The official Calico documentation describes this workflow as migration from an etcdv3 datastore to the Kubernetes datastore, so the introduction, basic usage explanation, and conclusion were updated to state that direction explicitly.
- The prerequisites specified `calicoctl` v3.25+. Current Calico migration documentation recommends using the latest `calicoctl`, so the prerequisite was updated accordingly.
- The target-cleanliness checks counted the table header from `calicoctl get` output. The examples now pipe through `tail -n +2` before `wc -l` so the count reflects resources only.
- The validation script used `calicoctl get networkpolicies` without `-A`, which only checks the default namespace for namespaced NetworkPolicy resources. It now uses `networkpolicies -A`.
- The conflict cleanup example used `calicoctl delete "$r" --all`, but `--all` is not a documented `calicoctl delete` option. The example now uses `calicoctl delete -f calico-export.yaml --skip-not-exists`, which matches the documented file-based delete flow and documented `--skip-not-exists` option.
- The troubleshooting section suggested `--allow-version-mismatch` for resource conflicts. That flag is not part of the documented `datastore migrate import` conflict handling, so the guidance was changed to deleting only intended conflicting target resources before retrying.

## Review Notes
The validation script remains a lightweight example and checks a subset of exported Calico resource types. The official export command can include additional resources such as GlobalNetworkSets, HostEndpoints, KubeControllersConfigurations, NetworkSets, IPReservations, and BGPFilters, so a production migration should verify every resource type present in the export.
