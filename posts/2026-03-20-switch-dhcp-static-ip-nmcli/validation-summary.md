# Validation Summary: How to Switch Between DHCP and Static IP with nmcli

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- nmcli
- NetworkManager
- DHCP
- Static IPv4 configuration
- Linux iproute2 commands
- RHEL/Linux network connection profiles

## Sources Consulted
- NetworkManager nmcli reference manual: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager nm-settings-nmcli reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager nmcli examples: https://networkmanager.dev/docs/api/latest/nmcli-examples.html
- Red Hat Enterprise Linux networking documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/configuring_and_managing_networking/configuring-and-managing-networking.pdf
- Local nmcli 1.46.0 `--help` and `--offline` validation
- Local iproute2 `ip address help`, `ip route help`, `ip-address(8)`, and `ip-route(8)` manuals

## Issues Found
- The `nmcli -t -f NAME,DEVICE,TYPE,GENERAL.STATE,IP4.ADDRESS connection show --active` command used fields that are not valid for the connection list view. `GENERAL.STATE` and `IP4.ADDRESS` are active-detail/device fields, not fields accepted by `connection show --active` in tabular list mode. Changed it to `nmcli -t -f NAME,DEVICE,TYPE,STATE connection show --active`.
- The rollback DHCP command cleared the static address and gateway but left `ipv4.dns` configured. Because the earlier static example sets manual DNS servers, this would not fully revert the profile to DHCP-provided DNS behavior. Added `ipv4.dns ""` to the rollback command.
- The key takeaway said separate DHCP and static profiles avoid losing access "without risk." Separate profiles make switching safer, but they do not eliminate the risk of losing access if the selected profile has a bad address, route, DNS, or autoconnect behavior. Changed the wording to "with less risk."

## Review Notes
- The primary `ipv4.method manual`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, `ipv4.method auto`, and `ipv4.dns-search` nmcli properties are current and match NetworkManager documentation.
- The examples assume the connection profile is named `eth0` and the interface is also `eth0`. On many systems the connection name differs from the device name, so users may need to substitute the actual connection profile name from `nmcli connection show`.
