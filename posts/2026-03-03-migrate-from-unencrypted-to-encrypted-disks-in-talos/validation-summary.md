# Validation Summary: How to Migrate from Unencrypted to Encrypted Disks in Talos

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Talos Linux (systemDiskEncryption, talosctl, machine configuration)
- LUKS2 disk encryption
- Kubernetes (kubectl drain/uncordon, node lifecycle, persistent volumes)
- etcd (quorum, member management)
- Replicated storage (Ceph, Longhorn) and local path provisioner

## Sources Consulted
- [Talos disk encryption docs](https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-encryption)
- [Talos CLI reference](https://docs.siderolabs.com/talos/v1.10/reference/cli)
- [Talos Resetting a Machine guide (v1.6)](https://docs.siderolabs.com/talos/v1.6/configure-your-talos-cluster/lifecycle-management/resetting-a-machine)
- etcd member management documentation
- talosctl reset/apply-config/validate/etcd command references

## Issues Found
- **`talosctl etcd remove-member` argument was incorrect.** The original post used `talosctl etcd remove-member --nodes 192.168.1.10 192.168.1.12`, passing an IP address as the member identifier. The command actually requires the etcd **member ID** (a hex value), not an IP or hostname. I updated the control plane migration steps to first call `talosctl etcd members --nodes 192.168.1.10` to discover the member ID, then call `talosctl etcd remove-member --nodes 192.168.1.10 <member-id>`. Step numbering in that block was also corrected (the original had two "Step 3" comments after the change).

## Review Notes
- The `systemDiskEncryption` schema (`state` and `ephemeral` sections, `provider: luks2`, `keys` array with `nodeID: {}` / `static.passphrase` and `slot` fields) matches the current Talos schema.
- `talosctl reset --graceful --reboot` is correct; default behavior wipes STATE and EPHEMERAL partitions, and `--graceful` cordons/drains and cleanly leaves etcd (so the explicit `etcd remove-member` step is mostly a safety net for the control plane case where the node may not leave cleanly).
- `talosctl apply-config --insecure --file ...` against a node in maintenance mode is the correct pattern.
- `talosctl validate --config <file> --mode metal` is correct; valid `--mode` values are `metal`, `cloud`, and `container`.
- `talosctl get volumestatus STATE/EPHEMERAL` reflects the current block/volumes resource model in modern Talos (v1.5+).
- Using a hardcoded passphrase string like `"recovery-key-store-securely"` in both the `state` and `ephemeral` sections of every example is for illustration only; in real deployments each cluster/partition should use a unique secret stored in a vault — readers should treat the example as a placeholder.
- The advice to never migrate more than one control plane node at a time, and the etcd quorum math for a 3-node cluster, is accurate.
