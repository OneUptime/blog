# Validation Summary: How to Set Up a DHCP Server with isc-kea on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ISC Kea DHCP server (kea-dhcp4-server, kea-dhcp6-server, kea-ctrl-agent, kea-admin)
- Ubuntu (apt, systemd)
- JSON-with-comments configuration
- DHCPv4 protocol (options, subnets, reservations, pools)
- Kea memfile lease backend (CSV)
- Kea REST API / control channel
- tcpdump for protocol observation

## Sources Consulted
- ISC Kea ARM (Administrator Reference Manual) — https://kea.readthedocs.io/en/latest/
- `kea-admin(8)` man page — https://kea.readthedocs.io/en/latest/man/kea-admin.8.html
- Kea logging docs (output-options/output_options) — https://kea.readthedocs.io/en/latest/arm/logging.html
- Kea control channel docs — https://kea.readthedocs.io/en/latest/arm/ctrl-channel.html
- ISC DHCP end-of-life announcement — https://www.isc.org/blogs/isc-dhcp-eol/

## Issues Found
1. **`output_options` is deprecated.** The Kea loggers example used `output_options`. The alias `output-options` was added in Kea 2.5.1 and `output_options` was deprecated in Kea 2.7.4, slated for removal in future versions. Updated the example to use the modern `output-options` form.
2. **Incorrect `kea-admin lease-dump` usage.** The post claimed `sudo kea-admin lease-dump v4 --output - memfile -l /var/lib/kea/kea-leases4.csv` could be used to inspect memfile leases. `kea-admin lease-dump` only supports the MySQL and PostgreSQL backends — not memfile — and the flag/argument syntax shown (`v4`, `-l`, `memfile` as a positional, `--output -`) is not valid. Replaced the subsection with an accurate note that memfile is already a CSV (no dump needed) and pointed the reader to the `lease4-get-all` REST API command for live queries against the running server.

## Review Notes
- The post's claim that ISC DHCP (dhcpd) reached end-of-life in 2022 is correct (final maintenance releases 4.4.3-P1 and 4.1-ESV-R16-P2 were published October 5, 2022).
- Package names (`kea-dhcp4-server`, `kea-dhcp6-server`, `kea-admin`, `kea-common`, `kea-ctrl-agent`), systemd unit name (`kea-dhcp4-server`), config path (`/etc/kea/kea-dhcp4.conf`), CLI flags (`kea-dhcp4 -V`, `kea-dhcp4 -t`), lease file path, and option names (`routers`, `domain-name-servers`, `domain-name`, `domain-search`, `broadcast-address`) all check out against Kea ARM.
- `dhcp-socket-type: "raw"`, `valid-lifetime`/`min-valid-lifetime`/`max-valid-lifetime`, `lfc-interval`, `subnet4[].id`, `interface`, and the `reservations` schema (`hw-address`, `ip-address`, `hostname`, per-reservation `option-data`) are all valid Kea 2.x configuration.
- The Kea Control Agent is being phased out: in Kea 2.7.2+ the DHCP daemons support HTTP/HTTPS control channels directly, and the Control Agent has been removed in Kea 3.1.8. Ubuntu's currently shipped packages still include `kea-ctrl-agent`, so the post's instructions still work on Ubuntu today, but readers using future Kea versions may need to configure the HTTP control socket directly on `kea-dhcp4` instead.
- For the control agent to actually reach `kea-dhcp4`, the DHCPv4 config also needs a matching UNIX `control-socket` entry. The Ubuntu default config typically includes one, so the post's example tends to work out of the box, but this is an implicit dependency worth flagging in a future revision.
- Editing the memfile CSV by hand while the server is running is workable but somewhat fragile; the `lease4-del` REST command is the more robust approach. The post already shows backing up the file first, which is good.
