# Validation Summary: How to Renew a DHCP Lease on macOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- macOS networking
- DHCP
- System Settings
- `scutil`
- `ipconfig`
- `networksetup`
- `ifconfig`
- Unified Logging (`log show`)
- DNS cache tools (`dscacheutil`, `mDNSResponder`)

## Sources Consulted
- Apple Support: Renew your IP address from the DHCP server on Mac - https://support.apple.com/guide/mac-help/renew-ip-address-dhcp-server-mac-mchlp1545/mac
- Apple Support: Change TCP/IP settings on Mac - https://support.apple.com/guide/mac-help/change-tcpip-settings-on-mac-mh14129/mac
- Apple Support: About networksetup in Remote Desktop - https://support.apple.com/guide/remote-desktop/about-networksetup-apdd0c5a2d5/mac
- Apple Developer Documentation: `SCNetworkInterfaceForceConfigurationRefresh(_:)` - https://developer.apple.com/documentation/systemconfiguration/scnetworkinterfaceforceconfigurationrefresh%28_%3A%29
- Apple open source: `ipconfig(8)` - https://github.com/apple-oss-distributions/bootp/blob/main/ipconfig.tproj/ipconfig.8
- Apple open source: `scutil` source and `--renew` usage - https://github.com/apple-oss-distributions/configd/blob/main/scutil.tproj/scutil.c
- Apple open source: `scutil` renew implementation - https://github.com/apple-oss-distributions/configd/blob/main/scutil.tproj/tests.c
- Apple open source: `ifconfig(8)` - https://github.com/apple-oss-distributions/network_cmds/blob/main/ifconfig.tproj/ifconfig.8
- Apple Support: Resolve issues with Profile Manager in macOS Server - https://support.apple.com/en-mide/102009

## Issues Found
- The post described `networksetup` as toggling DHCP off and on. I corrected that wording to reflect what Apple documents: `networksetup -setdhcp` sets the network service to use DHCP.
- The example `sudo ipconfig -v setifaddr en0` was not valid current `ipconfig` syntax. I replaced it with `sudo scutil --renew en0`, which Apple ships specifically to re-evaluate interface configuration immediately.
- The `ipconfig` section presented `ipconfig` as a normal renewal path without caveat. I added Apple’s documented limitation that `ipconfig` is intended for test/debug use and creates a temporary service.
- The post used `networksetup -getinfo "Wi-Fi"` as a general inspection example. I replaced it with documented inspection commands backed by Apple’s `ipconfig(8)` and `ifconfig(8)` references.
- The DNS cache section implied flushing DNS after renewal was part of the DHCP workflow. I clarified that it is optional and separate from renewing the lease.
- The claim that `ipconfig set en0 DHCP` triggers a new DORA exchange was too specific for the documented behavior. I replaced that takeaway with wording Apple documents more directly.

## Review Notes
- `scutil --renew <interface>` is an Apple-provided CLI path for forcing configuration refresh, but it uses the BSD interface name such as `en0`, not the network service name such as `Wi-Fi`.
- `networksetup -setdhcp <service>` uses the network service name such as `Wi-Fi` or `Ethernet`, not the BSD interface name.
- `ipconfig getpacket <interface>` is useful for inspecting DHCP options, including `server_identifier` and `lease_time`, but Apple explicitly documents `ipconfig` as a test/debug utility rather than a persistent configuration tool.
