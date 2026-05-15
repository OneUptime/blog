# Validation Summary: How to Fix 'Network Is Unreachable' Error on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux networking
- NetworkManager
- nmcli
- iproute2
- firewalld
- iptables
- DNS troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 8 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- NetworkManager nmcli reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager nm-settings-nmcli reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local command help for iproute2, nmcli, ping, and dig.

## Issues Found
- The post used `ens192` directly with `nmcli connection show`, `nmcli connection up`, and `nmcli connection modify`. NetworkManager connection commands operate on connection profiles, whose names can differ from the interface name. I added `nmcli -f NAME,DEVICE connection show --active` and changed the examples to use a connection profile name, with comments telling readers to replace it with their actual profile name.

## Review Notes
The temporary route command with `ip route add default via ... dev ...` is valid but does not persist across connection restarts or reboots; the post correctly follows it with the NetworkManager persistent configuration step. The `dig` command is valid, but on minimal RHEL installs it may require the package that provides DNS troubleshooting tools.
