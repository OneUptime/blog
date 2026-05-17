# Validation Summary: How to Add Tailscale to Talos Linux as a System Extension

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (system extensions, machine config, talosctl)
- Tailscale (mesh VPN, auth keys, subnet routing, exit nodes, ACLs)
- WireGuard
- Kubernetes (ClusterIP services, pod networking, API server)
- Talos Image Factory
- Tailscale Admin API

## Sources Consulted
- siderolabs/extensions repo - Tailscale extension: https://github.com/siderolabs/extensions/tree/main/network/tailscale
- Talos v1alpha1 machine configuration reference: https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.8/learn-more/image-factory/
- Talos Extension Services documentation: https://www.talos.dev/v1.10/advanced/extension-services/
- Tailscale Admin API documentation: https://tailscale.com/api
- siderolabs/tailscale container package: https://github.com/orgs/siderolabs/packages/container/package/tailscale
- Kubernetes Service documentation (default `kubernetes` service ClusterIP 10.96.0.1:443 over HTTPS)

## Issues Found

1. **`curl http://10.96.0.1:443` would fail** — The default Kubernetes API service at ClusterIP `10.96.0.1:443` is HTTPS-only with no plain HTTP listener. Plain `http://` against port 443 will produce a malformed-request error. Changed to `curl -k https://10.96.0.1:443` with a comment clarifying that this is the Kubernetes API service and `-k` is needed because the API server certificate is not issued for the ClusterIP.

2. **`op: create` in the auth key rotation section would fail** — The Talos machine config `op: create` operation fails when the target file already exists. Since the rotation flow writes to `/var/etc/tailscale/auth.env` (which was previously created during initial setup), the correct operation is `op: overwrite`. Changed `op: create` to `op: overwrite` only in the "Rotating Auth Keys" patch; the initial-setup snippets correctly keep `op: create`.

## Review Notes

- The Tailscale extension image format (`ghcr.io/siderolabs/tailscale:v1.62.0`), supported environment variables (`TS_AUTHKEY`, `TS_ROUTES`, `TS_EXTRA_ARGS`, `TS_HOSTNAME`), env file path (`/var/etc/tailscale/auth.env`), extension service name (`ext-tailscale`), and Image Factory schematic format are all correct.
- Talos and Tailscale versions referenced (`v1.7.0` for Talos installer, `v1.62.0` for Tailscale) are pinned point-in-time versions; readers should substitute the latest releases when applying in production.
- The troubleshooting tip `grep wireguard /proc/modules` may not show anything because WireGuard is built into the Talos kernel (compiled in, not a loadable module) and because the Tailscale extension on Talos commonly runs in userspace-WireGuard mode (`wireguard-go`). This is not strictly wrong, but its diagnostic value is limited. Left as-is since it is not technically incorrect.
- The `kubectl --server=https://100.64.0.3:6443 get nodes` example will work only if the API server certificate includes the Tailscale IP as a SAN, or if `--insecure-skip-tls-verify` is added. The post does not call this out, but it is contextually a how-to example rather than a precise reproducible command.
