# Validation Summary: How to Add a Static Route on macOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- macOS
- BSD `route`
- `networksetup`
- `launchd` / `launchctl`
- IPv4 routing

## Sources Consulted
- Apple Open Source `route(8)` man page: https://github.com/apple-oss-distributions/network_cmds/blob/main/route.tproj/route.8
- Apple Open Source `launchctl(1)` man page: https://github.com/apple-oss-distributions/launchd/blob/main/man/launchctl.1
- Apple Support, "Script management with launchd in Terminal on Mac": https://support.apple.com/guide/terminal/script-management-with-launchd-apdc6c1077b/mac
- Apple Developer Documentation, "Updating helper executables from earlier versions of macOS": https://developer.apple.com/documentation/servicemanagement/updating-helper-executables-from-earlier-versions-of-macos
- SS64 mirror of the macOS `networksetup` command help/man page: https://ss64.com/mac/networksetup.html

## Issues Found
- The post used `networksetup -addroute` and `networksetup -removeroute`, which are not supported `networksetup` subcommands. I replaced them with the supported `networksetup -setadditionalroutes` and `networksetup -getadditionalroutes` usage.
- The `networksetup` section described the feature as interface-specific and implied add/remove semantics. I corrected the wording to per-service additional routes and updated the example to show clearing the configured additional route list, which matches how `-setadditionalroutes` behaves.
- The persistent-route description and conclusion implied static routes were managed through Network Preferences/System Preferences directly. I corrected that wording to describe `networksetup` as configuring per-service additional routes.
- The `networksetup` command that changes routes did not use `sudo`. I added `sudo` to the commands that modify network configuration.

## Review Notes
`route add` with CIDR notation such as `192.168.2.0/24` is valid on macOS, and the `route` / `netstat` examples were otherwise technically sound. The launch daemon example remains valid for persistence, although `networksetup -setadditionalroutes` replaces the configured route list for a service rather than appending a single route.
