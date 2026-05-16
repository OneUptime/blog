# Validation Summary: How to Set Up Network Routes in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos machine configuration
- LinkConfig, WireguardConfig, and BlackholeRouteConfig network configuration documents
- talosctl
- Linux routing
- Kubernetes CNI routing

## Sources Consulted
- Talos static addressing documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/static
- Talos LinkConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/linkconfig
- Talos WireguardConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/wireguardconfig
- Talos Blackhole Routes guide: https://docs.siderolabs.com/talos/v1.13/networking/advanced/blackhole
- Talos BlackholeRouteConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/blackholerouteconfig
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos configuration patching guide: https://www.talos.dev/latest/talos-guides/configuration/patching/
- Talos Networking Resources guide: https://docs.siderolabs.com/talos/v1.7/learn-more/networking-resources/

## Issues Found
- The route configuration examples used the older embedded `machine.network.interfaces` format with `network` route keys. Updated the snippets to current network configuration documents, using `LinkConfig`, `addresses[].address`, and `routes[].destination`.
- The WireGuard example used the older inline interface `wireguard` shape. Updated it to `WireguardConfig` with `privateKey`, peer `allowedIPs`, addresses, and routes.
- The blackhole route example used an unsupported `blackhole: true` field under an interface route. Updated it to use `BlackholeRouteConfig`, which is the current Talos configuration document for blackhole routes.
- The verification section used `talosctl ping`, which is not present in the current `talosctl` CLI reference. Replaced it with `talosctl pcap` as a supported way to observe traffic while testing connectivity from another host.
- The live patching example used an inline patch for the older route format. Updated it to patch from `routes-patch.yaml` and added `--mode=try` for safer live network changes.

## Review Notes
The routing concepts and troubleshooting guidance are broadly correct. The examples now follow the current documented Talos network configuration model, but older Talos versions may still show legacy `machine.network.interfaces` examples in archived documentation.
