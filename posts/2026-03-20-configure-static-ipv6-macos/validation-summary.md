# Validation Summary: How to Configure Static IPv6 Addresses on macOS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- macOS network configuration (System Settings, networksetup)
- IPv6 addressing (SLAAC, manual/static)
- `networksetup` CLI utility
- `ifconfig` (BSD, as shipped on macOS)
- `route` for IPv6 default routes
- `ping6`, `netstat`, `dig` for verification
- IPv6 DNS (Google Public DNS 2001:4860:4860::8888 / ::8844)

## Sources Consulted
- [Apple/Xcode networksetup(8) man page](https://keith.github.io/xcode-man-pages/networksetup.8.html)
- [SS64 ifconfig command reference for macOS](https://ss64.com/mac/ifconfig.html)
- [SS64 networksetup command reference for macOS](https://ss64.com/mac/networksetup.html)
- [Apple Support: Use IPv6 on Mac](https://support.apple.com/guide/mac-help/use-ipv6-on-mac-mchlp2499/mac)

## Issues Found

1. **Incorrect verification command in "Configure Static IPv6 via networksetup" section.** The post used `networksetup -getv6additional Wi-Fi`, which is not a valid `networksetup` flag. The man page only defines `-getv6additionalroutes` (which lists additional IPv6 routes, not the primary IPv6 configuration). The correct command for verifying the manually-set IPv6 address, prefix, and router is `networksetup -getinfo Wi-Fi`. Changed to `networksetup -getinfo Wi-Fi`.

2. **Incorrect `ifconfig` keyword for adding a second IPv6 address.** The post used `sudo ifconfig en0 inet6 add 2001:db8::20 prefixlen 64`. Per the macOS (BSD) `ifconfig` man page, `add` is documented as a synonym for `alias` for IPv4 only; the documented keyword for IPv6 alias addresses is `alias`. Updated the line to `sudo ifconfig en0 inet6 2001:db8::20 prefixlen 64 alias` (alias placed at the end, the form shown in the macOS man page), so it remains a syntactically distinct alternative to the next line which uses `alias` immediately after `inet6`.

## Review Notes
- `ping6` is still present and functional on macOS (including Sonoma). Unlike Windows, macOS does not provide a `ping -6` alias, so `ping6` remains the right command. No change needed.
- The `route -n add -inet6 default <gateway>` syntax is correct for macOS; this is BSD route, where `-n` suppresses DNS resolution and `-inet6` selects the IPv6 routing table.
- `networksetup -setdnsservers <service> "empty"` works in a case-insensitive manner on current macOS, although Apple's documented form uses `Empty` with a capital E. The lowercase form used in the post is widely accepted in practice, so this was left unchanged.
- The first code block uses ` ```sql ` as the language hint for what is actually plain step-by-step instructions. This is a stylistic/rendering issue rather than a technical inaccuracy, so it was not modified per the "only fix technical errors" guideline.
- All example IPv6 addresses correctly use the `2001:db8::/32` documentation prefix (RFC 3849), and all DNS examples use Google's well-known IPv6 DNS endpoints.
