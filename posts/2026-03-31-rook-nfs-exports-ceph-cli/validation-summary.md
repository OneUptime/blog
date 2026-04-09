# Validation Summary: How to Create NFS Exports via Ceph CLI in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph NFS management CLI (`ceph nfs export`)
- NFS-Ganesha
- CephFS
- Ceph Object Gateway (RGW)
- Kubernetes (toolbox pod access)

## Sources Consulted
- Ceph NFS Manager documentation (main branch): https://github.com/ceph/ceph/blob/main/doc/mgr/nfs.rst
- Ceph NFS Manager Module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/nfs/module.py
- Ceph NFS Export module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/nfs/export.py
- Ceph Quincy NFS documentation: https://docs.ceph.com/en/quincy/mgr/nfs/
- NFS-Ganesha RADOS watch-notify mechanism: https://github.com/nfs-ganesha/nfs-ganesha/issues/757

## Issues Found

1. **Incorrect flag `--pseudo` (should be `--pseudo-path`)**: Both the `ceph nfs export create cephfs` and `ceph nfs export create rgw` commands used `--pseudo` as the flag name. The correct flag is `--pseudo-path` per the Ceph CLI specification. Fixed in both commands and the corresponding description bullet point.

2. **Deprecated `ceph nfs export delete` command**: The post used `ceph nfs export delete` which is a deprecated alias. The current command is `ceph nfs export rm`. Updated the command in the "Deleting an Export" section.

3. **Inaccurate DBus notification claim**: The post stated "Ganesha is notified via DBus to unexport the path." This is incorrect for Rook/Ceph deployments. The actual mechanism is RADOS watch/notify: the Ceph mgr module writes config changes to RADOS objects, and NFS-Ganesha watches these objects via the RADOS watch mechanism. When notified, Ganesha reloads its configuration. Updated the explanation to reference RADOS watch/notify.

4. **Incomplete JSON output example**: The `ceph nfs export info` output example was missing several fields that are present in actual output: `cluster_id`, `security_label`, and `clients`. Added these fields to the example.

5. **Incorrect `squash` value in output example**: The output example used `"squash": "none"` which, while accepted as an alias, does not match the default output format. Changed to `"no_root_squash"` to match actual CLI output.

6. **Incorrect `squash` value in apply example**: The `ceph nfs export apply` JSON example used `"squash": "root"` which is not a valid squash value. The correct value is `"root_squash"`. Fixed in the apply example.

## Review Notes
- The `ceph nfs export info` command (used in the post) is the current/preferred command. The older `ceph nfs export get` is deprecated but still works.
- The `ceph nfs export apply` command accepts both JSON and NFS-Ganesha EXPORT config fragment formats. The post only demonstrates JSON, which is fine for a tutorial.
- The toolbox pod access command (`kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash`) is correct for standard Rook deployments.
