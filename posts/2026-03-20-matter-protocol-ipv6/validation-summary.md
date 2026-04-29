# Validation Summary: How to Configure Matter Protocol with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Matter
- IPv6
- Thread
- Wi-Fi
- Ethernet
- Thread Border Router
- chip-tool
- DNS-SD / mDNS
- Matter bridge
- tcpdump

## Sources Consulted
- Matter build guide: https://project-chip.github.io/connectedhomeip-doc/guides/BUILDING.html
- Working with the CHIP Tool: https://project-chip.github.io/connectedhomeip-doc/development_controllers/chip-tool/chip_tool_guide.html
- Matter Client Example: https://project-chip.github.io/connectedhomeip-doc/examples/chip-tool/README.html
- Matter Linux Bridge Example: https://project-chip.github.io/connectedhomeip-doc/examples/bridge-app/linux/README.html
- Device discovery from a Host computer (mDNS Scanning): https://project-chip.github.io/connectedhomeip-doc/tips_and_troubleshooting/discovery_from_a_host_computer.html
- Matter 1.4 Core Specification: https://csa-iot.org/wp-content/uploads/2024/11/24-27349-006_Matter-1.4-Core-Specification.pdf

## Issues Found
- The introduction and conclusion implied that Matter needs a generally “IPv6-capable home network” in all cases. I corrected this to local IPv6 reachability, because the Matter 1.4 spec says link-local IPv6 is sufficient when all nodes are on the same Wi-Fi/Ethernet LAN, while routed Thread/infrastructure deployments need routable IPv6 prefixes.
- The network topology diagram used invalid IPv6 literals (`2001:db8::sensor1` and `2001:db8::plug1`). I replaced them with valid documentation-safe IPv6 examples.
- The Thread Border Router label implied it is always integrated into the controller. I changed that to “in hub or separate” because the border router can be a separate device.
- The development-environment package list was incomplete for the commands used later in the post and did not match the current Matter build guide. I updated it to the current build dependencies and added the diagnostic packages required by the post’s later commands.
- The build steps used an older/manual `gn gen out/host` flow and an incorrect `./out/host/chip-tool --version` verification path. I replaced this with the documented `scripts/examples/gn_build_example.sh examples/chip-tool out/debug` workflow and a simple runtime verification command.
- The Wi-Fi commissioning example mixed the `code-wifi` command with a QR payload. I changed it to the documented `pairing ble-wifi <node_id> <ssid> <password> <pin_code> <discriminator>` form.
- Both commissioning examples used shell line continuations with inline comments after backslashes, which would break in `bash`. I removed the inline trailing comments so the commands are syntactically valid.
- The interaction example claimed `chip-tool basicinformation read node-label 1 0` reads the device’s IPv6 address. That is incorrect. I replaced it with the documented `basicinformation read software-version` example.
- The IPv6 verification section only checked for global IPv6 addresses and implied Matter discovery is always mDNS. I changed it to `ip -6 addr show`, clarified that the `rdisc6` check applies to routed Wi-Fi/Ethernet + Thread deployments, and replaced discovery commands with the documented DNS-SD scans for commissionable and commissioned devices.
- The bridge section used incorrect build output paths and unsupported runtime flags (`--wifi`, `--interface`, `--passcode`) for the Linux bridge example. I replaced it with the documented Linux bridge build steps and `sudo out/debug/chip-bridge-app --ble-controller 1`.
- The traffic section said Matter “uses UDP port 5540 for secure channel” without qualification. I tightened that wording to the default/common secure device traffic case and limited the mDNS statement to Wi-Fi/Ethernet discovery.

## Review Notes
- The current Matter build guide notes that Ubuntu 22.04 requires Python 3.11 or newer. The post now flags that requirement, but readers on Ubuntu 22.04 may still need the exact upgrade commands from the official build guide.
- The Linux bridge example documentation is specifically tested on Raspberry Pi/Ubuntu and may require BLE adapter-specific adjustments on other Linux hosts.
