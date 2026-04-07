# Validation Summary: How to Set Up the Rook Module in Ceph Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph Manager (ceph-mgr)
- Rook Orchestrator Module
- Kubernetes
- Ceph Orchestrator CLI (`ceph orch`)
- Rook-Ceph Operator

## Sources Consulted
- Ceph official documentation on the Rook orchestrator module (https://docs.ceph.com/en/latest/mgr/rook/)
- Rook official documentation (https://rook.io/docs/rook/latest/)
- Ceph source code: `src/pybind/mgr/rook/module.py` — MODULE_OPTIONS and method implementations
- Ceph source code: `src/pybind/mgr/rook/rook_cluster.py` — RookEnv class for namespace discovery

## Issues Found

1. **Incorrect description of `storage_class` config key**: The blog stated this command "Set the Kubernetes namespace where Rook is deployed" but `mgr/rook/storage_class` is actually for specifying the storage class name for Local Storage Operator (LSO) discovered PersistentVolumes. The namespace is auto-discovered from the `POD_NAMESPACE` environment variable. Fixed the description and reordered the section to explain namespace auto-discovery first.

2. **`ceph orch apply osd --all-available-devices` does not work with Rook backend**: The Rook module's `create_osds` method explicitly raises an error: "Creating OSDs is not supported by rook orchestrator." OSD management must be done directly through the `CephCluster` custom resource. Replaced the command with the correct `kubectl patch` approach.

3. **Monitor placement limitation not mentioned**: The `apply_mon` method in the Rook module only supports count-based placement and explicitly rejects host list or label-based placement. Added a note about this limitation.

## Review Notes
- The Rook module also supports `secure_monitoring_stack` (bool) and `prometheus_tls_secret_name` (string) configuration options not mentioned in the post. These are optional and not core to the tutorial, so no change was made.
- The `ceph orch ps` output format shown is simplified but representative of the actual output structure.
