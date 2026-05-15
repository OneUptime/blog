# Validation Summary: How to Create and Modify NetworkManager Connection Profiles on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- NetworkManager keyfile connection profiles
- firewalld connection zones

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: NetworkManager connection profiles in keyfile format: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_networkmanager-connection-profiles-in-keyfile-format_configuring-and-managing-networking
- NetworkManager upstream reference: nm-settings-keyfile(5): https://networkmanager.dev/docs/api/latest/nm-settings-keyfile.html
- Local NetworkManager man pages: nm-settings-keyfile(5), nm-settings-nmcli(5)
- Local nmcli help output: `nmcli connection add --help`, `nmcli connection modify --help`, `nmcli connection clone --help`, `nmcli connection load --help`

## Issues Found
- The manual keyfile example set mode `600` but did not set `root:root` ownership. RHEL documentation requires NetworkManager keyfiles to be owned by root and readable/writable only by root, so I added `chown root:root` and updated the explanatory text.
- The introductory bullets overstated profile/device independence and active-profile behavior. I clarified that Ethernet profiles can be bound or unbound, and that one Ethernet profile per device is typically active at a time.
- The profile comparison example said it exported profiles, but `nmcli connection show` displays profile properties rather than exporting profile files. I changed the comment to describe the command accurately.
- The autoconnect-priority best practice referred to unspecified internal heuristics. The NetworkManager settings documentation says equal-priority profiles prefer the most recently connected profile, so I corrected the explanation.

## Review Notes
The post is technically sound after these corrections. RHEL documentation recommends using `nmcli`, the network RHEL system role, or nmstate instead of hand-editing keyfiles where possible, but manual keyfile creation is still documented and valid when ownership, permissions, syntax, and reload steps are handled correctly.
