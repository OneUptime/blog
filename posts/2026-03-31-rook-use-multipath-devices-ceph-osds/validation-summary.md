# Validation Summary: How to Use Multipath Devices with Ceph OSDs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux Multipath I/O (multipathd, device-mapper)
- Ceph OSDs (Object Storage Daemons)
- Rook Ceph Operator (CephCluster CRD)
- Kubernetes (kubectl, pod management)

## Sources Consulted
- Rook official documentation: CephCluster CRD storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook host cluster example configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/host-cluster/)
- Linux multipath documentation (multipath.conf man page)
- Kubernetes kubectl debug documentation (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)

## Issues Found

1. **`deviceFilter` should be `devicePathFilter`**: The post used `deviceFilter: "^mapper/mpath"` to match multipath device mapper paths. However, `deviceFilter` matches against short kernel device names (e.g., `sda`, `dm-0`), not full paths. For matching `/dev/mapper/mpath*` paths, Rook provides `devicePathFilter` which matches against full device paths. Changed to `devicePathFilter: "^/dev/mapper/mpath"`.

2. **Step 3 YAML config misleading**: The config snippet showing `deviceClass` and `encryptedDevice` was presented as the method to "allow device mapper in OSD pods," but these settings are unrelated to device mapper access. `deviceClass` sets the CRUSH device class and `encryptedDevice` controls dmcrypt encryption. Rook OSD pods are granted the necessary privileges to access `/dev/mapper` devices by default. Updated the description to be accurate and removed the unrelated `encryptedDevice` field.

3. **`kubectl debug` missing `--image` flag**: The troubleshooting command `kubectl -n rook-ceph debug node/worker-1 -- chroot /host ls -la /dev/mapper/` was missing the required `--image` flag. The `kubectl debug node/` command requires specifying a container image. Fixed to `kubectl debug node/worker-1 -it --image=busybox -- chroot /host ls -la /dev/mapper/`.

## Review Notes
- The `config: osdsPerDevice: "1"` in Step 2 is placed at the `storage` level (cluster-wide config), not inside the node entry. This is syntactically valid YAML and functionally correct as a default, but readers may misinterpret it as node-specific config. This is a minor clarity issue, not a technical error.
- The multipath.conf example uses NETAPP-specific vendor/product settings. This is fine as an example but readers with different storage vendors will need to adjust accordingly. The post could note this but it's implied by context.
