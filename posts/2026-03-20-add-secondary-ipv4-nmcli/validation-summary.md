# Validation Summary: How to Add a Secondary IPv4 Address with nmcli - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- NetworkManager
- `nmcli`
- IPv4 addressing
- `iproute2`

## Sources Consulted
- NetworkManager `nmcli` reference manual: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager `nm-settings-nmcli` reference manual: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local NetworkManager 1.46.0 command help and manual pages in the review environment: `nmcli --version`, `nmcli connection modify --help`, `nmcli connection show --help`, `nmcli device reapply --help`, `man nmcli`, `man nm-settings-nmcli`

## Issues Found
- The verification example used `ip addr show eth0`, which assumes the interface is named `eth0`. I changed it to `ip addr show dev <interface-name>` because modern Linux systems commonly use predictable interface names such as `enp1s0`, `ens3`, or similar.
- The "Set Address with Gateway" section implied that a secondary IPv4 address has its own gateway. In NetworkManager, `ipv4.gateway` sets the connection profile's default gateway. I renamed the section to "Set the Connection Gateway", updated the command comment, and added a clarification sentence so the post no longer suggests the gateway belongs to a specific secondary address.
- The wording around `nmcli connection up` was slightly imprecise. I changed "Apply the changes" to "Reactivate the connection to apply the profile change" and updated the summary to match the command's documented behavior.

## Review Notes
- The `+ipv4.addresses` and `-ipv4.addresses` syntax is valid for appending to and removing from a multi-valued address list in `nmcli`.
- `nmcli connection up <name>` is valid for activating the modified profile. On an already active device, `nmcli device reapply <ifname>` can sometimes apply supported profile changes without a full reactivation, but that is an implementation detail rather than a requirement for the commands shown in the post.
