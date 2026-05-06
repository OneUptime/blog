# Validation Summary: How to Configure Bluetooth Mesh with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Bluetooth Mesh
- Bluetooth Low Energy (BLE)
- IPv6
- 6LoWPAN
- IPSP / IPSS
- BlueZ
- Linux Bluetooth 6LoWPAN
- RIOT OS
- `radvd`

## Sources Consulted
- Bluetooth SIG, Bluetooth Mesh Networking primer: https://www.bluetooth.com/bluetooth-mesh-networking-primer/
- BlueZ `tools/mesh/README`: https://raw.githubusercontent.com/bluez/bluez/master/tools/mesh/README
- BlueZ `mesh-cfgclient` source: https://raw.githubusercontent.com/bluez/bluez/master/tools/mesh-cfgclient.c
- BlueZ `bluetooth-meshd` documentation: https://raw.githubusercontent.com/bluez/bluez/master/doc/bluetooth-meshd.rst.in
- BlueZ `bluetoothctl` documentation: https://raw.githubusercontent.com/bluez/bluez/master/doc/bluetoothctl.rst
- Linux kernel Bluetooth 6LoWPAN implementation: https://raw.githubusercontent.com/torvalds/linux/master/net/bluetooth/6lowpan.c
- IETF RFC 7668, IPv6 over Bluetooth Low Energy: https://www.rfc-editor.org/rfc/rfc7668.txt
- RIOT IPv6-over-BLE guide: https://raw.githubusercontent.com/RIOT-OS/RIOT/master/pkg/nimble/README.ipv6-over-ble.md
- RIOT `nimble_netif` API: https://raw.githubusercontent.com/RIOT-OS/RIOT/master/pkg/nimble/netif/include/nimble_netif.h
- RIOT `nimble_netif` implementation: https://raw.githubusercontent.com/RIOT-OS/RIOT/master/pkg/nimble/netif/nimble_netif.c
- RIOT NimBLE shell command implementation: https://raw.githubusercontent.com/RIOT-OS/RIOT/master/sys/shell/cmds/nimble_netif.c

## Issues Found
- The post claimed that Bluetooth Mesh Proxy Nodes act as IPv6 gateways. I corrected this to explain that Mesh Proxy carries mesh proxy PDUs over GATT, and that any IPv6 bridge is an application-layer gateway on the host rather than a standardized IP transport feature of Bluetooth Mesh.
- The BlueZ mesh setup section used incorrect tooling and commands. I replaced `bluetoothd --experimental`, `bluez-tools`, and invalid `mesh-cfgclient` commands such as `attach`, `create <network-key-hex>`, and `add-node` with the correct `bluez`/`bluez-meshd` package guidance, the `bluetooth-mesh` service, and valid `mesh-cfgclient` commands (`create`, `discover-unprovisioned`, `list-unprovisioned`, `provision`).
- The Linux `bluetooth_6lowpan` steps were incorrectly presented as part of Bluetooth Mesh proxying. I removed that mix-up and replaced it with a host-integration note that clearly separates Mesh Proxy from IPSP/6LoWPAN.
- The RIOT OS example used non-existent or incorrect pieces, including `nimble_ipsp` and `nimble_netif_accept(NULL, NULL, NULL)`. I replaced them with a valid `nimble_netif` + shell-based example and the current `ble adv RIOT-GNRC` flow, and added the SLAAC build flag required for Linux interop.
- The Raspberry Pi hub example used shell redirection that would fail without a root shell and used the wrong BLE address type for the RIOT example. I replaced the debugfs writes with `sudo tee` and changed the connect command to address type `2`, matching RIOT's documented default random-address behavior for `nimble_netif`.
- The IPv6 examples contained invalid addresses such as `2001:db8:ble:1::1` and `2001:db8:ble:1::sensor1`, and the `radvd` example omitted the ABRO option needed for RIOT's 6LN behavior. I replaced them with valid documentation prefixes and an ABRO-enabled `radvd` configuration based on RIOT's official IPv6-over-BLE guidance.

## Review Notes
- RIOT's official IPv6-over-BLE guide describes Linux/RIOT interoperability as highly experimental and notes that Linux does not support 6LoWPAN neighbor discovery in the way RIOT expects by default, which is why the SLAAC compile-time flag is required.
- On Debian/Ubuntu, `bluez-meshd` provides `bluetooth-meshd`, `mesh-cfgclient`, and the `bluetooth-mesh.service` unit, but package names can vary across distributions.
- The body is now technically accurate about the distinction between Bluetooth Mesh proxy access and native IPv6-over-BLE.
