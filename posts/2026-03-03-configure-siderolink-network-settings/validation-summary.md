# Validation Summary: How to Configure SideroLink Network Settings

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Talos Linux
- SideroLink (Sidero overlay management network)
- Sidero Omni
- WireGuard
- IPv6 ULA addressing (`fdae::/16`)
- `talosctl` / `omnictl` CLIs
- Kernel command-line arguments for Talos
- Networking: MTU, NAT/CGNAT traversal, DNS

## Sources Consulted
- Sidero Talos networking docs (SideroLink): https://docs.siderolabs.com/talos/v1.9/networking/siderolink/
- Talos `constants` package (kernel parameter names, defaults): https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/constants
- Omni self-hosted deployment guide (port defaults): https://github.com/siderolabs/omni-docs/blob/main/how-to-guides/self_hosted/index.md
- Omni run on-prem reference: https://docs.siderolabs.com/omni/self-hosted/run-omni-on-prem
- omnictl reference: https://docs.siderolabs.com/omni/reference/manage-omni-resources-with-omnictl
- siderolabs/omni issue #495 (siderolink-wireguard-advertised-addr): https://github.com/siderolabs/omni/issues/495

## Issues Found

1. **Default Omni port numbers were wrong throughout the post.** The post used `8099` everywhere as the default Omni endpoint port and `8090` as the events-sink port. Per the Omni self-hosted docs, Omni's defaults are:
   - SideroLink gRPC API (`--siderolink-api-bind-addr`): `8090`
   - SideroLink WireGuard tunnel (`--siderolink-wireguard-advertised-addr`): `50180`
   - Event sink (`--event-sink-port`): `8091`
   - Kernel log server: `8092`

   Fixed all `siderolink.api=grpc://...:8099` examples to `:8090`, all `talos.events.sink=[...]:8090` examples to `:8091`. The `talos.logging.kernel=tcp://[...]:8092` examples were already correct and were left unchanged.

2. **"WireGuard Port Configuration" section conflated the gRPC API port with the WireGuard tunnel port.** The post claimed SideroLink uses UDP 8099 by default for WireGuard traffic and then implied you change the WireGuard port by editing the URL port in `siderolink.api=grpc://omni.example.com:51820?...`. In reality the URL in `siderolink.api` only controls the gRPC API connection; the WireGuard endpoint is independent and is advertised to the node by Omni at registration time (configured server-side via `--siderolink-wireguard-advertised-addr`). Rewrote the section to correctly state the defaults (50180 WireGuard, 8090 gRPC API), to show the real Omni CLI flag instead of a non-existent `omni-config.yaml` schema, and to clarify that nodes learn the WireGuard endpoint automatically.

3. **Invalid `omni-config.yaml` schema.** The original showed a YAML snippet (`siderolink: wireguardPort: 51820`) for a self-hosted Omni config file format that does not exist. Replaced with the actual `--siderolink-wireguard-advertised-addr=<ip>:<port>` startup flag documented in the Omni self-hosted guide.

## Review Notes
- The `fdae::/16` ULA range, `siderolink` interface name, `SideroLinkDefaultPeerKeepalive = 25s`, and the kernel parameter names (`siderolink.api`, `talos.events.sink`, `talos.logging.kernel`) all match Talos source-code constants and were left as-is.
- The MTU breakdown ("60 bytes WireGuard + 40 bytes IPv6 = 100 bytes overhead, MTU 1400") is a reasonable approximation. WireGuard's stricter breakdown over IPv4 is 80 bytes overhead (MTU 1420) and over IPv6 is ~100 bytes (MTU 1400), so the final number is correct even if the individual components are rounded; not changed.
- The `omnictl get links`, `omnictl get machines`, `talosctl get links`, `talosctl get addresses`, `talosctl dmesg`, `talosctl logs controller-runtime`, and `talosctl apply-config` invocations all match current CLI syntax and were left as-is.
- The `--siderolink-api-bind-addr` flag in the Omni docs example uses `8090`; an older naming variant `--machine-api-bind-addr` shows up in some on-prem guides — both currently refer to the same SideroLink API bind on `8090`. The post does not reference either flag name directly, so no change required.
- The IPv6 address examples (`fdae:41e4:649b:9303::a1b2:c3d4:e5f6:7890`, etc.) exceed 128 bits if read literally as full hextets, but they are clearly illustrative placeholders rather than valid addresses; left as-is since they communicate the assignment idea without being prescribed real addresses.
