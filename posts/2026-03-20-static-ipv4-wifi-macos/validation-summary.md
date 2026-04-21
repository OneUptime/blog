# Validation Summary: How to Configure a Static IPv4 Address for WiFi on macOS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- macOS network settings
- Wi-Fi network service configuration
- Static IPv4 addressing
- DHCP
- DNS
- macOS network locations
- `networksetup`, `ipconfig`, `ifconfig`, `ping`, and `nslookup`

## Sources Consulted
- Apple Mac User Guide: Use DHCP or a manual IP address on Mac: https://support.apple.com/en-lamr/guide/mac-help/mchlp2718/mac
- Apple Mac User Guide: Change TCP/IP settings on Mac: https://support.apple.com/en-mide/guide/mac-help/mh14129/mac
- Apple Mac User Guide: Change DNS settings on Mac: https://support.apple.com/en-lamr/guide/mac-help/mh14127/mac
- Apple Support: Use network locations on Mac: https://support.apple.com/en-us/105129
- Apple Remote Desktop User Guide: About networksetup: https://support.apple.com/guide/remote-desktop/about-networksetup-apdd0c5a2d5/mac
- macOS `networksetup(8)` manual page: https://manp.gs/mac/8/networksetup
- macOS `ipconfig(8)` manual page: https://keith.github.io/xcode-man-pages/ipconfig.8.html

## Issues Found
- The Step 1 command comments claimed the initial commands showed current IP, gateway, and DNS, but `ifconfig en0` shows interface details and does not show DNS. Updated the comments and added `networksetup -getdnsservers "Wi-Fi"` for DNS verification.
- The post used `networksetup -listallnetworkservices` under "Check interface name." That command lists network service names, not BSD device names such as `en0`. Added `networksetup -listallhardwareports` and changed the comment to distinguish service names from interface names.
- The GUI instructions used the older **Advanced** button path for macOS Ventura and later. Updated the steps to use **Details** on macOS Ventura or later while keeping **Advanced** for macOS Monterey and earlier.
- The location-management example used only the older System Preferences path and `scselect`. Updated the GUI comments for current macOS and changed the command-line switch examples to the documented `networksetup -switchtolocation` command.
- The DHCP renewal step used `ipconfig set en0 DHCP` without noting that `ipconfig set` changes are temporary and depend on the actual Wi-Fi device name. Added a clarification while keeping `networksetup -setdhcp` as the persistent DHCP configuration command.
- The conclusion referenced only the older System Preferences > Advanced path. Updated it to cover System Settings/System Preferences and Details/Advanced.

## Review Notes
- The example static address `192.168.1.50` is syntactically valid, but in practice readers should choose an unused address or reserve/exclude it from the DHCP pool to avoid address conflicts.
- The service name `Wi-Fi` and device name `en0` are typical on Macs, but users should confirm them with `networksetup -listallnetworkservices` and `networksetup -listallhardwareports`.
