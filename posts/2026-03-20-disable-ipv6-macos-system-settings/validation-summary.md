# Validation Summary: How to Disable IPv6 on macOS via System Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- macOS network configuration
- IPv6
- System Settings / System Preferences
- `networksetup`
- `ifconfig`
- `ping6`

## Sources Consulted
- Apple Support: Change TCP/IP settings on Mac - https://support.apple.com/guide/mac-help/mh14129/mac
- Apple Support: Use IPv6 on Mac - https://support.apple.com/guide/mac-help/mchlp2499/mac
- Apple Support: Wi-Fi settings on Mac - https://support.apple.com/en-ca/guide/mac-help/mh11935/mac
- Apple Support: Ethernet settings on Mac - https://support.apple.com/en-au/guide/mac-help/-mh11939/mac
- Apple Developer: Recording a Packet Trace - https://developer.apple.com/documentation/network/recording-a-packet-trace
- Apple OSS Distributions: `ifconfig` man page - https://raw.githubusercontent.com/apple-oss-distributions/network_cmds/main/ifconfig.tproj/ifconfig.8
- Apple OSS Distributions: `ping6` man page - https://raw.githubusercontent.com/apple-oss-distributions/network_cmds/main/ping6.tproj/ping6.8
- Apple OSS Distributions: `ping6` source - https://raw.githubusercontent.com/apple-oss-distributions/network_cmds/main/ping6.tproj/ping6.c

## Issues Found
- The post claimed the macOS GUI offers `Configure IPv6 -> Off`. Apple’s current Mac documentation lists `Automatically`, `Manually`, and `Link-local only` for IPv6; `Off` is documented for IPv4, not IPv6. I updated the title, description, instructions, and summary to reflect the actual GUI behavior.
- The verification section assumed Wi-Fi is always `en0`. Apple’s networking documentation notes that interface names vary by machine. I added `networksetup -listallhardwareports` and changed the instructions to tell readers to substitute the actual interface name.
- The verification section said selecting `Off` should produce no `inet6` lines. Apple’s `ifconfig` documentation notes that basic IPv6 operation uses link-local addressing, and the GUI path documented by Apple is `Link-local only`. I changed verification to check that only `fe80::` link-local addresses remain and that global IPv6 addresses are absent.
- The post prescribed an exact `ping6` failure string. Apple’s `ping6` implementation does produce `UDP connect` errors for routing failures, but the exact wording depends on the underlying error. I changed this to an example rather than a guaranteed exact output.
- The multiple-interface section specifically called out VPN adapters as if they use the same TCP/IP flow. Apple’s current VPN settings documentation does not present that as a general rule, so I changed the wording to cover only network services that actually expose TCP/IP settings.

## Review Notes
- The updated article is technically accurate for the GUI workflow Apple currently documents: the GUI can set IPv6 to `Link-local only`, which limits IPv6 traffic to the local network, but it does not document a full IPv6 `Off` option in System Settings.
