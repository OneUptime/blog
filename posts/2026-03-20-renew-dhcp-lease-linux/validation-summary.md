# Validation Summary: How to Renew a DHCP Lease on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- DHCP / ISC dhclient
- NetworkManager / nmcli
- systemd-networkd / networkctl
- systemd-resolved / resolvectl
- nscd

## Sources Consulted
- ISC DHCP `dhclient` manual: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhclient
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager configuration reference (`dhcp` backend selection): https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- systemd `networkctl` manual: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- systemd `resolvectl` manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html

## Issues Found
- `nmcli device reapply eth0` was described as a DHCP renew mechanism. I changed this to `nmcli device disconnect eth0` and `nmcli device connect eth0` because the official `nmcli` docs define `reapply` as applying changed connection settings to the active device, not renewing a DHCP lease.
- The post claimed `dhclient -r eth0 && dhclient eth0` was a universal method regardless of network manager. I corrected this to stack-specific guidance because NetworkManager can use its internal DHCP client or other DHCP backends, so `dhclient` is not universal.
- The DNS cache flush section used `systemd-resolve --flush-caches`. I replaced it with `resolvectl flush-caches`, which is the current command documented by systemd.
- The post said `dhclient -v` shows the full DORA process. I changed this to "verbose DHCP logs" because verbose mode logs DHCP activity but does not guarantee a full discover-offer-request-ack sequence in every situation.
- The lease-file example implied `/var/lib/dhcp/dhclient.leases` was the general path. I qualified it as a common Debian/Ubuntu path because the `dhclient` lease file location is build- and distribution-dependent.
- `networkctl renew eth0` was missing `sudo`. I added it because it is a state-changing administrative action.
- The generic `ip addr flush dev eth0` plus `dhclient eth0` fallback was removed from the restart section because it is not an appropriate general recommendation when another network manager owns the interface.

## Review Notes
- `networkctl renew` is documented in systemd as available since version 244, so very old systemd-based systems may need to use the restart fallback instead.
- The examples intentionally use `eth0` and `enp3s0` as placeholders; actual interface names vary by distribution and predictable interface naming rules.
- On NetworkManager systems, `nmcli -f DHCP4 device show <ifname>` is a cleaner way to inspect DHCP lease details than grepping the full `device show` output.
