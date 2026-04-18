# Validation Summary: How to Configure WiFi Mesh Networking with Proper IPv4 Subnetting

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IEEE 802.11s (wireless mesh networking)
- IEEE 802.11r (fast BSS transition / roaming)
- OpenWrt (UCI config: `/etc/config/wireless`, `/etc/config/network`, `/etc/config/dhcp`)
- dnsmasq (DHCP/DNS)
- `iw` userspace tool (mesh path inspection)
- IPv4 subnetting

## Sources Consulted
- OpenWrt 802.11s mesh guide: https://openwrt.org/docs/guide-user/network/wifi/mesh/802-11s
- OpenWrt base DHCP configuration: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt wireless configuration reference: https://openwrt.org/docs/guide-user/network/wifi/basic
- kernel.org `iw` documentation (mpath subcommand)

## Issues Found
1. **Invalid encryption value for 802.11s mesh mode.** Both the gateway and non-gateway mesh `wifi-iface` blocks used `option encryption 'psk2'`. OpenWrt's 802.11s mesh mode only supports `none` or `sae` (WPA3-SAE, via `wpad-mesh-*`); `psk2` (WPA2-PSK) is an AP-mode value and is not valid for mesh. Changed both occurrences to `option encryption 'sae'` and added an inline note about the `wpad-mesh-*` package requirement.
2. **DHCP pool size inconsistent with stated range.** The post described the pool as `192.168.1.100-200` but used `option limit '150'`. In OpenWrt UCI, `limit` is the count of addresses (not the upper bound), so `start=100, limit=150` actually yields `.100`–`.249`. Changed `limit` to `101` so the effective pool matches the documented `.100`–`.200` range, and added an inline comment clarifying the meaning.

## Review Notes
- `option mesh_fwding '1'` in `/etc/config/wireless` is not a formally documented UCI wifi-iface option (mesh forwarding is a runtime parameter typically set via `iw dev <iface> set mesh_param mesh_fwding 1` or via `mesh11sd`). It is harmless (silently ignored) and is commonly seen in community configs, so it was left as-is. Future revisions may want to set it via a hotplug script or drop it entirely since forwarding is enabled by default.
- `option type 'bridge'` on the dedicated `mesh` management interface is unusual — the mesh backbone typically does not need its own bridge. It works, but a plain static interface would be cleaner. Left as-is since it is not technically broken.
- The post's implicit assumption is that non-gateway nodes will bridge their client-facing `lan` with the mesh so DHCP from the gateway can reach clients. The provided snippets don't explicitly show this bridging; readers following the tutorial verbatim may need to add the mesh interface to the `lan` bridge on non-gateway nodes for client traffic to traverse the backhaul.
- `mobility_domain 'abcd'` is valid (2-octet hex / 4 hex characters, per the OpenWrt wifi-iface reference).
- The `iw dev wlan1 mpath dump` and `iw dev wlan1 mpath get <mac>` commands are both valid `iw` subcommands for inspecting 802.11s mesh paths.
