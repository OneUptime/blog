# Validation Summary: How to Rotate Disk Encryption Keys in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- LUKS2 disk encryption
- Kubernetes (`kubectl drain`, `wait`, `uncordon`)
- TPM-backed disk encryption keys
- GitHub Actions (scheduled workflows / cron)
- HashiCorp Vault (`vault kv put`)
- OpenSSL (`openssl rand`)

## Sources Consulted
- [Talos v1.10 disk encryption documentation](https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-encryption)
- [Talos v1.9 disk encryption documentation](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-encryption)
- [Talos v1.9 disk management documentation](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-management)
- [Talos editing machine configuration docs](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/editing-machine-configuration)
- LUKS2 specification (32 key slot maximum)

## Issues Found
No technical issues found.

Verifications performed:
- `systemDiskEncryption` YAML structure with `state` / `ephemeral` blocks, `provider: luks2`, and `keys` array — matches official docs.
- `slot` is correctly placed as a sibling of the key-type field (e.g. `static`, `tpm`) at the same indentation level — confirmed against Talos docs.
- Static key type uses the `passphrase` field nested under `static:` — confirmed.
- TPM key type uses `tpm: {}` (empty object) — valid YAML and matches Talos schema.
- Claim that LUKS2 supports up to 32 key slots — correct (LUKS2 on-disk format spec).
- Claim that Talos automatically syncs the configured keys list with actual LUKS2 slots — confirmed in official docs ("Talos always tries to sync the keys list defined in the machine config with the actual keys defined for the LUKS2 partition").
- Rotation workflow (add new key → verify → remove old key) — matches the documented approach which requires keeping at least one unchanged key during the swap.
- `talosctl apply-config --nodes <ip> --file <file>` — valid command/flags.
- `talosctl get volumestatus STATE/EPHEMERAL --nodes <ip> -o yaml` — valid; STATE and EPHEMERAL are the documented system volume identifiers.
- `talosctl get volumes --nodes <ip>` and `talosctl get machineconfig --nodes <ip> -o yaml` — valid commands.
- `talosctl reboot --nodes <ip>` — valid.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` — uses the current (non-deprecated) flag name.
- `kubectl wait --for=condition=Ready node/<name> --timeout=300s` — valid syntax.
- `openssl rand -base64 48` — valid.
- Cron expression `'0 2 1 */3 *'` — correctly fires at 02:00 on day-of-month 1 every 3 months (quarterly).

## Review Notes
- The Step 3 example for static passphrase rotation re-uses `slot: 0` for the new key (previously the old key was in slot 0 and the new key in slot 1). Talos handles this slot remapping fine because key order/slot reassignment is supported, but readers could equivalently leave the new key in `slot: 1` to make the diff conceptually simpler. This is a stylistic note, not a correctness issue.
- The post does not call out that Talos disk encryption is a `v1alpha1` machine config feature and that some changes may require careful rollouts; the workflow described is the supported path, but users on older Talos versions should consult the docs for their specific version.
- The TPM rotation example assumes the node has a TPM 2.0 device and SecureBoot configured; this prerequisite is implicit rather than explicit, but is mentioned indirectly via the link to LUKS2/TPM.
