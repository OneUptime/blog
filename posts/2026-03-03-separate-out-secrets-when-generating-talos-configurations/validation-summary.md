# Validation Summary: How to Separate Out Secrets When Generating Talos Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl`)
- Kubernetes (cluster bootstrapping, etcd, kubernetes service account, aggregator CA)
- Mozilla SOPS (with `age` encryption)
- HashiCorp Vault / AWS Secrets Manager (mentioned)
- GitHub Actions (CI/CD example)

## Sources Consulted
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli (for `talosctl gen secrets` and `talosctl gen config` flags)
- Talos talosctl install docs: https://docs.siderolabs.com/talos/v1.12/getting-started/talosctl (confirmed the `https://talos.dev/install` script is real)
- Talos source — secrets bundle types: https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/config/generate/secrets/secrets.go
- Talos source — bundle YAML loader: https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/config/generate/secrets/bundle.go
- Talos testdata example secrets bundle: https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/config/generate/secrets/testdata/secrets.yaml (canonical reference for the YAML field naming)
- siderolabs/crypto PEMEncodedCertificateAndKey struct: https://raw.githubusercontent.com/siderolabs/crypto/main/x509/certificate_key.go (confirmed `Crt` / `Key` field names)
- SOPS latest release asset names: https://api.github.com/repos/getsops/sops/releases/latest

## Issues Found

1. **Wrong flag name `--from-secrets` (multiple occurrences).** The `talosctl gen config` subcommand does not accept `--from-secrets`. The correct flag is `--with-secrets` (per the v1.12 CLI reference: `--with-secrets string  use a secrets file generated using 'gen secrets'`). Replaced every occurrence (in body, CI/CD example, and rotation section).

2. **Incorrect YAML field casing in the example secrets bundle.** The Talos secrets bundle uses default Go YAML marshaling with no explicit `yaml:"..."` tags on the field names, so all keys are lowercased. The post showed camelCase keys, which would not match an actual bundle. Fixed:
   - `bootstrapToken` → `bootstraptoken`
   - `secretboxEncryptionSecret` → `secretboxencryptionsecret`
   - `trustdInfo` → `trustdinfo`
   - `k8sAggregator` → `k8saggregator`
   - `k8sServiceAccount` → `k8sserviceaccount`
   - Certificate sub-key `cert:` → `crt:` (the Go struct field is `Crt`, marshals as `crt`). Applied to all five cert entries.
   Verified against the canonical `testdata/secrets.yaml` in the Talos repo.

3. **Inconsistent encryption-secret naming in the bullet list.** The bullet said "Aescbc encryption key", but the example file (and the modern Talos default) shows `secretboxencryptionsecret`. Modern Talos defaults to secretbox; aescbc is the older option. Changed the bullet to "Secretbox encryption key" so it matches the example.

4. **Broken SOPS download URL in the GitHub Actions example.** The post used `https://github.com/getsops/sops/releases/latest/download/sops-linux-amd64`. SOPS releases do not ship an asset with that name — assets are named like `sops-v3.13.0.linux.amd64` (version embedded). The `latest/download/<asset>` redirect requires an exact asset filename, so this would 404. Replaced with a versioned URL using a `SOPS_VERSION=v3.13.0` shell variable so the asset name resolves correctly.

## Review Notes
- The `curl -sL https://talos.dev/install | sh` install command is correct; this script is officially documented by Sidero Labs.
- Pinning `SOPS_VERSION` in CI (as I did in the fix) is also the safer practice — using "latest" in CI can lead to unexpected breakage when SOPS publishes a new release.
- The post correctly notes that machine configs generated with `--with-secrets` still embed the secrets; the bundle is the source of truth, but the resulting `controlplane.yaml` / `worker.yaml` are still sensitive and must not be committed in cleartext.
- The Talos CA rotation caveat in the "Rotating Secrets" section is accurate — rotating cluster CAs is a disruptive operation and Talos documents this explicitly.
- The `kv put ... @secrets.yaml` and `kv get -format=yaml ...` Vault commands are valid for Vault KV v1; for KV v2 the round-trip is slightly different (data is wrapped under `data:`), but the basic pattern shown is fine as an illustration.
