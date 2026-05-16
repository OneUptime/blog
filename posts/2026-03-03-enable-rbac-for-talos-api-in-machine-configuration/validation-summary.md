# Validation Summary: How to Enable RBAC for Talos API in Machine Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration)
- Talos API RBAC (`machine.features.rbac`)
- `talosctl` CLI (`gen config`, `config new`, `apply-config`, `logs`, `dmesg`, `get members`, `reboot`, `kubeconfig`)
- Kubernetes (`kubernetesTalosAPIAccess` feature)
- GPG (symmetric encryption for backups)
- `shred` (secure file deletion)

## Sources Consulted
- [Talos RBAC documentation (v1.10)](https://docs.siderolabs.com/talos/v1.10/security/rbac)
- [Talos RBAC documentation (v1.9)](https://www.talos.dev/v1.9/talos-guides/configuration/rbac/)
- [Talos MachineConfig reference (v1.8)](https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config)
- [GitHub issue #12576 — Allow specifying roles when generating `talosconfig` offline from secrets](https://github.com/siderolabs/talos/issues/12576)
- [talosctl reference (v1.6)](https://docs.siderolabs.com/talos/v1.6/learn-more/talosctl)

## Issues Found

1. **Incorrect `talosctl` command for generating role-specific talosconfigs.** The post originally used `talosctl gen config <cluster> <endpoint> --with-secrets secrets.yaml --roles os:reader --output reader-talosconfig`. The `--roles` and `--output` flags are not supported by `talosctl gen config` (GitHub issue #12576 is an open feature request to add `--roles` to that command). Per the official Talos RBAC docs, role-scoped client configs are created with `talosctl config new --roles=<role> <path>`, which connects to the cluster and issues a new client certificate. Replaced both examples with the correct `talosctl config new` syntax and added a brief note about the default 10-year certificate TTL and the `--crt-ttl` flag.

2. **Incorrect role count.** The post stated "The three built-in roles are:" but Talos defines four: `os:admin`, `os:operator`, `os:reader`, and `os:etcd:backup`. Updated the list to include `os:etcd:backup` and refined the description of `os:reader` to match the docs (access to "safe" methods, e.g. list files but not read file contents).

3. **Misleading "default" framing.** The intro stated "By default, any client with a valid certificate has full administrative access." This is only true when RBAC is disabled; per the official docs, RBAC is enabled by default in new clusters created with `talosctl` v0.11+. Rephrased to clarify that the full-admin behavior applies when RBAC is disabled, and noted the current default for new clusters.

## Review Notes

- The `machine.features.rbac: true` syntax and the `kubernetesTalosAPIAccess` block (with `enabled`, `allowedRoles`, `allowedKubernetesNamespaces`) match the v1alpha1 Talos config reference and are correct.
- All other `talosctl` commands shown (`apply-config`, `logs machined`, `dmesg`, `get members`, `reboot`, `kubeconfig`) use correct subcommands and flag syntax.
- The GPG and `shred -u` examples for handling the break-glass admin config are syntactically correct.
- `talosctl config new` requires connectivity to the cluster (it calls the API to mint a new certificate); the post now mentions this implicitly. A future revision could explicitly note that the issuing user needs `os:admin` (or sufficient privileges) on the cluster to create a lower-privilege config for someone else.
- The cluster endpoint `https://10.0.0.1:6443` referenced in earlier drafts is no longer present after the command fix, so the Kubernetes-API-vs-Talos-API endpoint distinction is no longer a concern in this post.
