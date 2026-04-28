# Validation Summary: How to Use NetworkManager Dispatcher Scripts for Custom Actions

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- NetworkManager (Linux network management daemon)
- NetworkManager-dispatcher
- Bash shell scripting
- Linux networking (`ip route`, NFS mount)
- systemd / journalctl

## Sources Consulted
- NetworkManager-dispatcher official documentation: https://networkmanager.dev/docs/api/latest/NetworkManager-dispatcher.html
- NetworkManager(8) and NetworkManager-dispatcher(8) man pages

## Issues Found
- The Script Events Reference table listed `pre-up` and `pre-down` without noting that NetworkManager only invokes these blocking actions for scripts placed in the dedicated subdirectories `dispatcher.d/pre-up.d/` and `dispatcher.d/pre-down.d/`. A script for these events placed in the main `dispatcher.d/` directory would not run on those events. I updated the descriptions in the events table to clarify the required subdirectories so a reader following this post does not get silently-failing pre-up/pre-down hooks.

## Review Notes
- The script arguments (`$1` = interface, `$2` = action) and the location (`/etc/NetworkManager/dispatcher.d/`) are accurate.
- The listed events (`up`, `down`, `dhcp4-change`, `dhcp6-change`, `vpn-up`, `vpn-down`) are valid NetworkManager dispatcher actions.
- The conclusion's permission requirements ("owned by root and not group/world-writable") match the official spec; the docs additionally require the script not be setuid, but that is an edge-case nuance.
- Manual invocation as shown in "Test a Dispatcher Script Manually" works for the example scripts since they only reference `$1`/`$2`. Scripts that depend on environment variables NetworkManager normally injects (`CONNECTION_UUID`, `IP4_ADDRESS_N`, `DHCP4_*`, etc.) would not behave identically when invoked manually — worth keeping in mind for future expansions of the post.
- For completeness, NetworkManager also defines additional actions not covered here (`vpn-pre-up`, `vpn-pre-down`, `hostname`, `connectivity-change`, `reapply`, `dns-change`, `device-add`, `device-delete`), but the omission is acceptable for an introductory tutorial.
