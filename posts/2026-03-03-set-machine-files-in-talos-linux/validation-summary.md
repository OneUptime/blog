# Validation Summary: How to Set Machine Files in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (immutable OS for Kubernetes)
- `machine.files` configuration field (v1alpha1 schema)
- talosctl CLI (`apply-config`, `list`, `read`)
- containerd CRI configuration merge mechanism
- udev rules
- TOML / YAML configuration formats

## Sources Consulted
- Talos v1alpha1 MachineFile schema: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos v1alpha1 schema (v1.9): https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config
- Talos Containerd customization guide (v1.7): https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/images-container-runtime/containerd
- Talos Containerd customization guide (v1.9): https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/images-container-runtime/containerd
- Talos Host DNS guide: https://docs.siderolabs.com/talos/v1.9/talos-guides/network/host-dns/
- siderolabs/talos GitHub issue #8016 "Structured /var": https://github.com/siderolabs/talos/issues/8016

## Issues Found

1. **Incorrect containerd configuration path.** The post used `path: /var/cri/conf.d/20-custom.toml` for the CRI customization example. The official Talos documentation specifies that the containerd base config merges in `/etc/cri/conf.d/20-customization.part` — the directory is `/etc/cri/conf.d/`, not `/var/cri/conf.d/`, and the filename must follow the `*-customization.part` pattern for the merge to take effect. Fixed by updating both the path in the YAML and the surrounding explanation.

2. **Misleading claim about `/var/etc/resolv.conf` bind mount.** The post stated "Talos can pick up custom DNS configuration from `/var/etc/resolv.conf`" via an implicit bind mount from `/var/etc/`. This is inaccurate — Talos does not provide a generic bind mount from `/var/etc/` to `/etc/`. DNS in particular is owned by the Talos host DNS resolver, which auto-generates `/etc/resolv.conf` from `machine.network.nameservers`. Reworded the paragraph to point users to `machine.network.nameservers` for DNS and to warn that not every file under `/var/etc/` is automatically consumed.

## Review Notes
- The three supported `op` values (`create`, `append`, `overwrite`) and the `0o`-prefixed octal `permissions` format are correct per the v1alpha1 `MachineFile` schema.
- The `talosctl apply-config`, `talosctl list`, and `talosctl read` commands and flags shown are correct.
- `machine.udev` is a real configuration section; the post's mention of it is accurate. The "udev rules via machine.files" use case at `/var/etc/udev/rules.d/` is presented as a more-control alternative, but in practice udevd in Talos reads its own rule paths and would not necessarily consume files dropped there — the canonical mechanism is `machine.udev.rules`. The post already recommends `machine.udev` as the primary approach, so no edit was made.
- The post correctly notes that `machine.certSANs` and the registry TLS config are the canonical Talos paths for trust, rather than just dropping a CA cert into the filesystem.
- Version-specific caveat: the writable-paths model under `/var` has been discussed for restructuring in siderolabs/talos issue #8016. Future Talos versions may tighten which paths under `/var` are accepted by `machine.files`.
