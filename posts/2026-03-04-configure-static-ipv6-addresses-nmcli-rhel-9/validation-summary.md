# Validation Summary: How to Configure Static IPv6 Addresses with nmcli on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- IPv6 addressing and routing
- NetworkManager keyfile profiles

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9.6 Release Notes, NetworkManager keyfile gateway behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.6_release_notes/known-issues
- NetworkManager nm-settings-nmcli reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager nm-settings-keyfile reference: https://networkmanager.dev/docs/api/latest/nm-settings-keyfile.html
- Local nmcli 1.46.0 help and local NetworkManager man pages: `nmcli connection modify --help`, `man nm-settings-nmcli`, `man nm-settings-keyfile`

## Issues Found
- The post described `ipv6.method auto` as SLAAC only. Updated it to clarify that NetworkManager uses Router Advertisements/SLAAC and can also use DHCPv6 when advertised by the router.
- The external connectivity test used `2600::`, which is not a reliable general-purpose test endpoint. Replaced it with `2001:4860:4860::8888`, matching one of the configured IPv6 DNS servers.
- The keyfile example showed the default gateway attached to `address1`. Updated the example to current RHEL 9.6 behavior with a separate `gateway=` key, and added a note that RHEL 9.5 and earlier may show the older `address1=address/prefix,gateway` format.
- The privacy extensions section implied temporary addresses are created on top of a purely manual static configuration. Updated it to clarify that `ipv6.ip6-privacy` affects SLAAC-generated addresses, not manually configured static addresses by themselves.

## Review Notes
The nmcli commands for setting `ipv6.method manual`, `ipv6.addresses`, `ipv6.gateway`, `ipv6.dns`, appending/removing addresses with `+`/`-`, activating a connection, and using `ipv6.method link-local` are consistent with NetworkManager and Red Hat documentation. The generated keyfile location is correct for default RHEL 9 keyfile profiles.
