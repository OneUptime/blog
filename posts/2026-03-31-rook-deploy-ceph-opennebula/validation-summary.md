# Validation Summary: How to Deploy Ceph on OpenNebula HCI Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (cephadm deployment, RBD, CephX authentication)
- OpenNebula (datastores, VM templates, live migration, CLI tools)
- Hyper-Converged Infrastructure (HCI)

## Sources Consulted
- Ceph documentation: cephadm bootstrap, pool creation, and CephX auth commands — https://docs.ceph.com/en/latest/cephadm/
- Ceph documentation: RBD pool initialization — https://docs.ceph.com/en/latest/rbd/
- OpenNebula documentation: Ceph datastore configuration (DS_MAD, TM_MAD, DISK_TYPE, POOL_NAME, CEPH_HOST, CEPH_USER, CEPH_SECRET) — https://docs.opennebula.io/stable/open_cluster_deployment/storage_setup/ceph_ds.html
- OpenNebula documentation: VM migration commands and `--live` flag — https://docs.opennebula.io/stable/management_and_operations/references/cli/onevm.html

## Issues Found
1. **Live migration command missing `--live` flag**: The `onevm migrate <VM_ID> <HOST_ID>` command without `--live` performs a cold migration (the VM is stopped, transferred, and restarted on the destination host). For live migration (VM continues running during migration), the `--live` flag is required: `onevm migrate --live <VM_ID> <HOST_ID>`. Fixed the command and updated the comment to say "Live migrate" for clarity.

## Review Notes
- The post tags include "Rook" but the deployment method described is cephadm, not Rook. This is not an error in the post content itself (tags were provided externally), but readers searching for Rook-specific content may find this misleading.
- The `CEPH_HOST` configuration uses a single monitor IP. For production HA deployments, multiple monitor addresses should be listed (space-separated, e.g., `"192.168.1.10 192.168.1.11 192.168.1.12"`). This is not incorrect but is a single point of failure consideration.
- The `ceph osd pool create one 128 128 replicated` command manually specifies PG counts. In modern Ceph (Pacific+), the pg_autoscaler module is enabled by default, and manual PG specification is generally unnecessary. The command still works but could be simplified to `ceph osd pool create one replicated`.
