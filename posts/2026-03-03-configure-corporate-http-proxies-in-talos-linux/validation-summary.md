# Validation Summary: How to Configure Corporate HTTP Proxies in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.env`, `machine.files`, `machine.registries.mirrors`)
- `talosctl` CLI (`gen config`, `patch machineconfig`, `get machineconfig`, `image pull`, `logs`)
- Kubernetes (pod env vars, mutating webhooks, service/pod CIDRs, `cluster.local` DNS)
- containerd registry mirrors
- HTTP/HTTPS proxy environment variables (`http_proxy`, `https_proxy`, `no_proxy`)
- TLS interception / corporate CA trust

## Sources Consulted
- Talos Linux v1.7 Corporate Proxies guide — https://docs.siderolabs.com/talos/v1.7/networking/corporate-proxies/
- Talos Linux v1.7 v1alpha1 configuration reference — https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos Linux v1.7 talosctl CLI reference — https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos source (machinery v1alpha1 types) — https://github.com/siderolabs/talos/blob/main/pkg/machinery/config/types/v1alpha1/v1alpha1_types.go
- Talos Configuration Patches guide — https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching

## Issues Found
1. **Custom CA certificate path and operation were incorrect.** The original post showed:
   ```yaml
   path: /etc/ssl/certs/corporate-ca.crt
   op: create
   ```
   Talos does not run `update-ca-certificates`, so dropping a standalone `.crt` file into `/etc/ssl/certs/` does not get it trusted by system services. The official Talos corporate-proxies guide instructs users to append the certificate to the existing system CA bundle. Updated to:
   ```yaml
   path: /etc/ssl/certs/ca-certificates
   op: append
   ```
   and added a brief explanatory sentence so the reader knows why `append` (and the bundle path) matters.

## Review Notes
- `machine.env` is a free-form `map[string]string` in the Talos schema, so setting both lowercase (`http_proxy`/`https_proxy`/`no_proxy`) and uppercase (`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`) variants is accepted by the validator. Note that the official Talos docs only explicitly document the lowercase forms; Go's `net/http` (used by most Talos/Kubernetes components) honors both cases with lowercase taking precedence, so the uppercase variants are mostly belt-and-braces for non-Go tooling. Left as-is because the recommendation is conservative and harmless.
- `talosctl patch machineconfig --nodes ... --patch @file.yaml` is valid syntax — `patch` takes a resource type, and `machineconfig` (alias `mc`) is the MachineConfig resource. Note this is distinct from the offline-patching command `talosctl machineconfig patch`.
- `talosctl image pull`, `talosctl get machineconfig -o yaml`, `talosctl logs machined`, and `talosctl logs containerd` are all valid subcommands/service names.
- The kernel-cmdline-based early bootstrap proxy option (`talos.environment=http_proxy=...`) from the official docs is not mentioned in the post. This is not a technical error — just a coverage gap that could be added in a future revision for users who need proxy access before machine config is applied (e.g., during initial install/PXE).
- Version-specific caveat: The Talos config reference URLs above are pinned to v1.7. Field names and behaviors used in the post (`machine.env`, `machine.files` with `op: append`, `machine.registries.mirrors.endpoints`) are stable across recent Talos releases.
