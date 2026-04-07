# Validation Summary: How to Use RBD with Nomad

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage)
- HashiCorp Nomad (CSI plugin support)
- Ceph CSI Driver (cephcsi v3.11.0)
- Container Storage Interface (CSI)
- Docker (task driver)
- PostgreSQL (example stateful workload)

## Sources Consulted
- HashiCorp Nomad CSI documentation: https://developer.hashicorp.com/nomad/docs/concepts/plugins/csi
- HashiCorp Nomad volume specification: https://developer.hashicorp.com/nomad/docs/other-specifications/volume
- HashiCorp Nomad job specification (csi_plugin stanza): https://developer.hashicorp.com/nomad/docs/job-specification/csi_plugin
- Ceph CSI driver repository and documentation: https://github.com/ceph/ceph-csi
- Nomad CLI reference for `nomad volume register` and `nomad volume status`: https://developer.hashicorp.com/nomad/docs/commands/volume

## Issues Found

1. **Controller plugin job type was `system` instead of `service`** (Step 1): The CSI controller plugin was deployed as `type = "system"`, which runs an instance on every Nomad client node. CSI controller plugins should be `type = "service"` with `count = 1` since only a single controller instance is needed for volume provisioning and management. Running controllers on every node is wasteful and can cause conflicts. Changed to `type = "service"` with `count = 1`.

2. **Attachment mode inconsistency between volume registration and job usage** (Steps 3 and 4): The volume was registered in Step 3 with `attachment_mode = "block-device"`, but referenced in Step 4's job spec with `attachment_mode = "file-system"`. These must match. Since the volume is used with PostgreSQL via `volume_mount` (which requires a mounted filesystem, not a raw block device), changed Step 3's volume registration to `attachment_mode = "file-system"` to be consistent with the job spec.

## Review Notes
- The Ceph CSI image `quay.io/cephcsi/cephcsi:v3.11.0` is a valid release. Newer versions (v3.12.x+) may be available; authors may want to update the image tag in the future.
- The post does not cover Ceph cluster connection configuration (e.g., monitors, fsid) which would typically be needed in the CSI plugin config or volume parameters. Real deployments would need a `ceph-csi-config` ConfigMap equivalent or additional parameters.
- The `secrets` block in the volume registration uses the admin user, which is not recommended for production. A dedicated CSI user with limited permissions would be more appropriate, but this is acceptable for a tutorial.
