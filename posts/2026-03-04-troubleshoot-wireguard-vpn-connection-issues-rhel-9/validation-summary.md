# Validation Summary: How to Troubleshoot WireGuard VPN Connection Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- WireGuard
- wireguard-tools (`wg`, `wg-quick`)
- NetworkManager (`nmcli`)
- firewalld
- systemd-resolved (`resolvectl`)
- Linux networking commands (`ip`, `ss`, `sysctl`)
- iperf3

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up a WireGuard VPN: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_setting-up-a-wireguard-vpn_configuring-and-managing-networking
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- WireGuard `wg(8)` manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8
- WireGuard `wg-quick(8)` manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- firewalld documentation: https://firewalld.org/documentation/
- systemd `resolvectl(1)` manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The firewalld check used `firewall-cmd --list-ports`, which only shows ports for the default zone and can miss a WireGuard allowance configured as a service or in a different active zone. Updated the example to check active zones and inspect the relevant zone with `--list-all`.
- The DNS section stated that `wg-quick` modifies `/etc/resolv.conf` directly. Upstream `wg-quick` applies the `DNS` setting through `resolvconf`, which may update resolver configuration depending on the system. Updated the wording to match `wg-quick(8)` behavior.
- The MTU guidance said the WireGuard MTU should simply be the physical MTU minus overhead and gave 1420 as the value for a 1500-byte physical MTU. Updated this to note that the tunnel MTU must fit within the path MTU, `wg-quick` auto-detects an MTU when unset, and 1420 is a conservative value for a 1500-byte path MTU.
- The `wg-quick` failure list included "config file permissions too open" as a startup failure. That is a security issue and may produce warnings, but it is not a reliable cause of `wg-quick` startup failure. Replaced it with invalid syntax or unreadable config file.

## Review Notes
The post is technically relevant and the main troubleshooting flow is accurate. RHEL documentation currently identifies WireGuard as a Technology Preview in RHEL 9 and notes that it is unsupported for production SLAs; this is worth mentioning in a future RHEL-specific article, although it was not required to correct the troubleshooting commands.
