# Validation Summary: How to Configure IPv6 Prefix Policy on Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 address selection (RFC 6724)
- Windows networking
- netsh interface ipv6 commands
- PowerShell (used to invoke netsh)
- IPv6 prefix policy table (precedence, labels, prefixes)

## Sources Consulted
- RFC 6724 - Default Address Selection for Internet Protocol Version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc6724
- Microsoft netsh interface ipv6 reference: https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-interface-ipv6
- Windows IPv6 prefix policies reference: https://sites.google.com/view/windows-ipv6-prefix-policies/home
- Microsoft KB / documentation on prioritizing IPv4 over IPv6 (DisabledComponents and prefix policy table)

## Issues Found
- The example output of `netsh interface ipv6 show prefixpolicies` did not match the actual Windows default prefix policy table. Specifically:
  - `2001::/32` was listed with precedence 20 and label 3 — corrected to precedence 5, label 5 (Teredo).
  - `fc00::/7` was listed with precedence 10 and label 5 — corrected to precedence 3, label 13 (ULA).
  - `::/96` was listed with precedence 5 and label 5 — corrected to precedence 1, label 3 (IPv4-compatible).
  - A `2001:20::/28` entry with precedence 3 was included; this is not part of the standard Windows default prefix policy table and was removed.
  - The corrected table now reflects the documented Windows default that aligns with RFC 6724's policy table.

## Review Notes
- The narrative claims are correct: `::/0` defaults to precedence 40 and `::ffff:0:0/96` to precedence 35 on modern Windows, so IPv6 is preferred over IPv4-mapped by default.
- The `netsh interface ipv6 add/set/delete prefixpolicy` syntax shown is correct.
- `netsh interface ipv6 reset` does reset the prefix policy table to defaults, but it also resets other IPv6 stack settings (interface bindings, etc.). The post's wording is acceptable but readers should be aware the reset is broader than just prefix policies.
- The PowerShell section correctly notes that there are no built-in cmdlets for the prefix policy table (e.g., no `Get-NetPrefixPolicy`); netsh must be invoked.
- The "Prefer IPv4 for Legacy Applications" example contains a redundant `set` command for `::/0` that re-applies its existing default (precedence 40, label 1); not technically incorrect, just redundant.
- The "Window" tag (vs. "Windows") is a minor spelling issue but not a technical error and was left untouched per scope.
