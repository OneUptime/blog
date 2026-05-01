# Validation Summary: How to Disable IPv6 on macOS via Command Line

## Status
validated

## Post Type
Guide

## Technologies Covered
- macOS networking
- IPv6
- `networksetup`
- `ifconfig`
- `ping6`
- `scutil`
- `launchd` / `launchctl`

## Sources Consulted
- Apple Support: About `networksetup` in Remote Desktop - https://support.apple.com/guide/remote-desktop/about-networksetup-apdd0c5a2d5/mac
- Apple Support: Change TCP/IP settings on Mac - https://support.apple.com/guide/mac-help/change-tcp-ip-settings-on-mac-mh14129/mac
- Apple Support: Use IPv6 on Mac - https://support.apple.com/guide/mac-help/use-ipv6-on-mac-mchlp2499/mac
- Apple Support: Script management with `launchd` in Terminal on Mac - https://support.apple.com/guide/terminal/script-management-with-launchd-apdc6c1077b/mac
- Apple Developer: Recording a Packet Trace - https://developer.apple.com/documentation/network/recording-a-packet-trace
- Apple Developer: WWDC20, “What's new in managing Apple devices” - https://developer.apple.com/videos/play/wwdc2020/10639/
- Apple OSS Distributions: `configd` (`scutil` source and usage) - https://github.com/apple-oss-distributions/configd
- Apple OSS Distributions: `launchd` (`launchctl` / `launchd.plist` man pages) - https://github.com/apple-oss-distributions/launchd
- Apple OSS Distributions: `network_cmds` (`ifconfig` / `ping6`) - https://github.com/apple-oss-distributions/network_cmds

## Issues Found
- The post showed state-changing `networksetup` commands without `sudo`. Apple’s WWDC20 guidance for `networksetup` notes that modifying system-wide preferences is protected and that admins can use `sudo`. I added `sudo` to the write operations and added a root check to the “all network services” script.
- The post said “all interfaces,” but the script actually iterates over network services returned by `networksetup -listallnetworkservices`. Apple documents that command as listing network services, not interfaces. I corrected the section title, comments, and summary wording.
- The verification examples hardcoded `en0`. Apple’s packet-trace documentation explicitly says interface device names vary by machine, so `en0` is not a safe stand-in for Wi-Fi or Ethernet across Macs. I changed the post to tell readers to map the service to the correct device with `networksetup -listallhardwareports` and then use `ifconfig enX`.
- The post implied a LaunchDaemon was needed to make the change persistent across reboots. Based on Apple’s documentation, `networksetup` changes saved network settings, while `launchd` is the mechanism for running a job at boot. I changed that section to optional boot-time re-application instead of “persistent disable.”
- The script and verification flow used a `networksetup -getv6additional` check that I could not validate from the Apple references reviewed here. I removed that verification dependency and kept the verification steps on Apple-documented interface mapping plus standard networking tools.

## Review Notes
- The post was reviewed against Apple documentation and Apple-published source/manpage repositories, but the commands were not executed in this workspace because the review environment is Linux rather than macOS.
- Apple’s current GUI documentation for macOS surfaces IPv6 modes such as Automatic, Manual, and Link-local only in Network settings. The article remains valid as a command-line guide after the corrections above, but readers should expect exact service names and interface device names to vary by Mac.
