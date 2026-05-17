# Validation Summary: How to Back Up Talos Linux Machine Configurations

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (`talosctl` CLI)
- COSI / Talos machine configuration resources
- GPG (symmetric encryption)
- AWS Secrets Manager
- HashiCorp Vault
- SOPS / git-crypt
- Bash scripting, cron, `tar`, `find`
- AWS S3 (for offsite backup)

## Sources Consulted
- Talos Linux CLI reference: https://www.talos.dev/v1.10/reference/cli/#talosctl-gen-config
- `talosctl` source (gen config flags): https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/mgmt/gen/config.go
- Talos editing machine configuration guide: https://www.talos.dev/v1.6/talos-guides/configuration/editing-machine-configuration/
- Talos discussions on extracting machine configs: https://github.com/siderolabs/talos/discussions/9288
- Talos issue on formatting `talosctl get machineconfig`: https://github.com/siderolabs/talos/issues/10399
- GPG manual (symmetric / AES256 usage)
- AWS Secrets Manager CLI reference (`create-secret`)
- HashiCorp Vault KV CLI reference (`vault kv put`)
- SOPS README (`--encrypt --in-place`, `--decrypt`)

## Issues Found

1. **`talosctl get machineconfig -o yaml` returns a COSI resource wrapper, not a directly re-appliable machine config.**
   - The raw output includes COSI metadata (`metadata`, `namespace: config`, `type: MachineConfigs.config.talos.dev`) and nests the actual config under `.spec`. As written, the backup files would not be usable with `talosctl apply-config` without an additional extraction step.
   - **Fix:** Updated every `talosctl get machineconfig ... -o yaml` invocation to pipe through `yq eval '.spec' -` so the saved file contains the actual machine config and is directly re-appliable. Added a short comment noting why.

2. **`talosctl gen config --output-dir` is a hidden/legacy flag.**
   - Per the talosctl source (`cmd/talosctl/cmd/mgmt/gen/config.go`), `--output-dir` is marked hidden and kept only for backwards compatibility. The current, documented flag is `-o, --output`. The published CLI reference for v1.9 / v1.10 only lists `--output`.
   - **Fix:** Replaced `--output-dir ./generated` with `--output ./generated` in the example `talosctl gen config` invocation.

3. **Inaccurate description of how the secrets bundle is created.**
   - The post stated that `talosctl gen config` "produces a secrets bundle". In practice, `talosctl gen config` embeds the secrets inside `controlplane.yaml`/`worker.yaml` but does not write a separate `secrets.yaml` file. A standalone bundle is produced by `talosctl gen secrets -o secrets.yaml` (which can then be passed to `gen config` via `--with-secrets`).
   - **Fix:** Reworded the sentence to mention both `talosctl gen secrets -o secrets.yaml` (explicit) and the implicit embedding by `talosctl gen config`.

## Review Notes

- The validation script's example (`for config in ${BACKUP_DIR}/*.yaml`) assumes the tar extracts back into `${BACKUP_DIR}`. Since `tar czf ${BACKUP_DIR}.tar.gz -C ${BACKUP_BASE}/${CLUSTER} ${DATE}` was created with `-C`, the extraction would place files under `./${DATE}/` relative to the current directory. This is an illustrative script, not production-ready, so it was left as-is.
- The post does not specify a Talos version. The verified flags and commands (`talosctl validate --mode metal`, `talosctl apply-config --insecure`, default `~/.talos/config` path, `--with-secrets`, `--config-patch`, `--config-patch-control-plane`, `--config-patch-worker`) are all current as of Talos v1.9 / v1.10. If the Talos team ever removes the hidden `--output-dir` alias, only the (already-fixed) gen config example would have been affected.
- `yq` is now a hard dependency of the backup workflow due to the COSI-spec extraction. Readers should install Mike Farah's `yq` (the Go implementation), as the syntax `yq eval '.spec' -` follows v4+ conventions.
