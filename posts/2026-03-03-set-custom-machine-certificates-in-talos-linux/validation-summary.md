# Validation Summary: How to Set Custom Machine Certificates in Talos Linux

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes
- etcd
- OpenSSL
- X.509 certificates / PKI
- TLS / mTLS
- YAML machine configuration

## Sources Consulted
- Talos Linux v1.11 official documentation: https://docs.siderolabs.com/talos/v1.11/
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.11/reference/cli
- Machine configuration v1alpha1 reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config/
- CA rotation guide: https://docs.siderolabs.com/talos/v1.11/security/ca-rotation
- Talos source: `pkg/machinery/resources/secrets` (https://github.com/siderolabs/talos/tree/main/pkg/machinery/resources/secrets)
- Talos source: `cmd/talosctl/cmd/talos/time.go` and `cmd/talosctl/cmd/talos/get.go`

## Issues Found

1. **Non-existent `talosctl get certificates` / `talosctl get certificate` resource.**
   The post referenced `talosctl get certificates` and `talosctl get certificate` for inspecting certificates on a node. No such resource type exists in Talos. The valid certificate-adjacent resource in the `secrets.talos.dev` group is `CertSANs` (queryable as `talosctl get certsans`). Replaced the invalid commands with `talosctl get certsans` and added an `openssl` workflow for inspecting client certificate dates.

2. **Outdated CA rotation procedure.**
   The post described CA rotation as a manual workflow of `talosctl gen secrets` + `talosctl gen config` followed by re-applying configs to nodes. Talos provides a dedicated, supported command for this: `talosctl rotate-ca` (with `--talos`, `--kubernetes`, and `--dry-run` flags). Replaced the manual workflow with the documented `talosctl rotate-ca` invocations and noted the behavioral difference between Talos API CA rotation (no cluster interruption) and Kubernetes API CA rotation (requires pod restarts).

3. **Repeated invalid command in best practices block.**
   The "Automate certificate expiry checking" block reused the non-existent `talosctl get certificates ... | grep notAfter` pipeline. Replaced with a `yq` + `openssl x509` pipeline that decodes the client certificate stored in `~/.talos/config`.

4. **Same invalid command echoed in Troubleshooting bullet.**
   The "Expired certificates" troubleshooting bullet pointed users at `talosctl get certificates`. Updated to recommend extracting the client cert from `talosconfig` and running `openssl x509 -noout -dates`, and pointed the "Missing SANs" bullet at `talosctl get certsans`.

## Review Notes

- The machine configuration field names verified as correct: `machine.ca` (crt/key), `cluster.ca` (crt/key), `cluster.etcd.ca` (crt/key), `cluster.aggregatorCA` (crt/key). All match the v1alpha1 schema.
- `machine.certSANs`, `machine.files` (with `content`, `permissions`, `path`, `op`), and `machine.registries.config.<host>.tls.ca` are all valid per the v1alpha1 reference. The `permissions: 0o644` Go-style octal literal is the form shown in Talos' own documentation examples.
- `talosctl gen csr --roles os:reader` is valid; `--roles` is a documented flag on `gen csr` with a default of `[os:admin]`.
- `talosctl gen crt --ca <prefix> --csr <file> --name <output>` is correct; `--ca` takes a path prefix from which `<prefix>.crt` and `<prefix>.key` are loaded.
- `talosctl time` and `talosctl dmesg` are valid commands.
- The post does not mention a Talos version. Commands and fields were validated against Talos v1.11 (current at time of review). The `talosctl rotate-ca` command has been available since Talos 1.8, so the guidance is broadly applicable to recent Talos releases.
- The `talosctl gen secrets`/`talosctl gen config` snippet in the "Bringing Your Own CA" section is still useful and accurate for greenfield cluster bootstrap with a custom PKI, so it was left intact in that section.
