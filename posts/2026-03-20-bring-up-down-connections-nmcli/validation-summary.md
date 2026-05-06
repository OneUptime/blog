# Validation Summary: How to Bring Up and Down Connections with nmcli

## Status
validated

## Post Type
Guide

## Technologies Covered
- `nmcli`
- NetworkManager
- Linux networking

## Sources Consulted
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nmcli-examples` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- Local installed `nmcli` help/man output (`nmcli --help`, `nmcli connection help`, `nmcli device help`, `man nmcli`) from `nmcli` 1.46.0

## Issues Found
- The post described `nmcli connection show` as showing "all connections and their state". I changed this to "all configured connection profiles" because the command lists profiles; device state is shown by `nmcli device status`.
- The DHCP renewal example implied `nmcli connection up <profile>` renews DHCP without a full reconnect. I corrected this to a `down` + `up` reconnect sequence for a fresh DHCP request, and clarified that `nmcli device reapply` reapplies changes from the active profile rather than renewing DHCP.
- The disconnect/deactivation explanations were too loose. I updated the `device disconnect` note and key takeaways to reflect that device-level disconnect blocks further auto-activation on that device, while `connection down` deactivates a specific profile and the device may still auto-activate another suitable profile.
- The `nmcli monitor` description was narrowed to connection-state changes only. I updated it to match the official behavior more closely: it monitors overall NetworkManager activity.

## Review Notes
- The commands in the post are valid for the installed `nmcli` 1.46.0. On newer NetworkManager documentation, `nmcli device up/down` are also documented as aliases alongside `connect/disconnect`, but the post's use of `connect` and `disconnect` is current and correct.
