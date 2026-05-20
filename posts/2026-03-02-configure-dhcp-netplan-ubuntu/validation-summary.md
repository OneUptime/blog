# Validation Summary: How to Configure DHCP with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu networking
- Netplan
- systemd-networkd
- NetworkManager
- DHCPv4 and DHCPv6
- IPv6 privacy extensions

## Sources Consulted
- Netplan YAML reference / Ubuntu netplan(5): https://manpages.ubuntu.com/manpages/resolute/man5/netplan.5.html
- Netplan try man page: https://manpages.ubuntu.com/manpages/questing/man8/netplan-try.8.html
- systemd.network(5): https://man7.org/linux/man-pages/man5/systemd.network.5.html
- systemd-networkd-wait-online(8): https://manpages.ubuntu.com/manpages/xenial/man8/systemd-networkd-wait-online.8.html
- RFC 4941, Privacy Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc4941
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131

## Issues Found
- The DNS override section said static `nameservers.addresses` are used instead of DHCP DNS by themselves. Netplan's `use-dns` default is true, and DHCP DNS takes precedence with the networkd backend, so the example now sets `dhcp4-overrides.use-dns: false`.
- The DHCP route examples combined `use-routes: false` with `route-metric`. Since ignored DHCP routes do not need a metric, the misleading `route-metric` lines were removed from those examples.
- The DHCP client identifier example used duplicate `dhcp-identifier` keys and described MAC as the default. Netplan documents the networkd default as IAID+DUID when omitted or set to `duid`; the example now shows only the MAC override.
- The DHCPv6 privacy example was described as "only IPv6 with a static IPv6 prefix" even though the snippet did not configure a static prefix and still enabled DHCPv4. The wording now matches the shown configuration.
- The systemd-networkd drop-in path used `enp3s0.network.d`, but Netplan-generated network files are typically named like `10-netplan-enp3s0.network`. The example now tells readers to check the generated network file and uses the matching drop-in directory name.
- The requested DHCP address example did not mention that `RequestAddress=` is a systemd-networkd 255+ option. The example now includes that version caveat.
- The DHCP timeout section used a non-existent `RequestTimeout=` key under `[DHCPv4]`. It now explains that systemd-networkd retries DHCP by default and shows how to adjust the `systemd-networkd-wait-online` timeout for boot waiting behavior.

## Review Notes
Corrected Netplan YAML snippets were checked with `netplan generate --root-dir` and parsed successfully. Some advanced behavior, especially systemd-networkd drop-ins and `RequestAddress=`, depends on the generated network file name and systemd version on the target Ubuntu release.
