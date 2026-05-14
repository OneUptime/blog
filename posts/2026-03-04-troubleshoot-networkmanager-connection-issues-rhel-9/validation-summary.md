# Validation Summary: How to Troubleshoot NetworkManager Connection Issues on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- systemd journal / journalctl
- iproute2
- tcpdump
- firewalld
- NetworkManager dispatcher scripts
- NetworkManager keyfile connection profiles

## Sources Consulted
- NetworkManager nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager.conf reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Red Hat Enterprise Linux 9 documentation, NetworkManager keyfile profiles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_networkmanager-connection-profiles-in-keyfile-format_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, managing the default gateway setting: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/managing-the-default-gateway-setting_configuring-and-managing-networking
- Local nmcli manual page, where available in the review environment.

## Issues Found
- The introduction said NetworkManager handles all network configuration on RHEL. RHEL uses NetworkManager by default, but administrators can still use other tools or unmanaged devices. Changed this to "the default network configuration" for accuracy.
- The `connected` device-state explanation said "Everything is working." In NetworkManager, this means a connection profile is active on the device; DNS, routing, firewall, or upstream connectivity can still be broken. Updated the explanation accordingly.
- The route metric command used `ip route show | sort -t ' ' -k 7 -n`, which assumes a fragile field position in `ip route` output. Replaced it with `ip -4 route show` and `ip -6 route show`, matching Red Hat's documented verification commands and preserving metric visibility when routes include metrics.

## Review Notes
The remaining commands and examples are technically valid for RHEL 9 / NetworkManager usage. NetworkManager documentation recommends `TRACE` for full debug collection, but the post's `DEBUG` example is still a valid temporary verbosity increase.
