# Validation Summary: How to Set Up a Local DNS Resolver with Unbound

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Unbound recursive DNS resolver
- DNSSEC trust anchors and validation
- Unbound root hints and local zones
- unbound-control remote administration
- systemd-resolved DNS forwarding
- Linux package management on Debian/Ubuntu and RHEL-family systems

## Sources Consulted
- NLnet Labs Unbound `unbound.conf(5)`: https://www.nlnetlabs.nl/documentation/unbound/unbound.conf/
- NLnet Labs Unbound `unbound-control(8)`: https://www.nlnetlabs.nl/documentation/unbound/unbound-control/
- NLnet Labs Unbound `unbound-anchor(8)`: https://www.nlnetlabs.nl/documentation/unbound/unbound-anchor/
- NLnet Labs "Howto enable DNSSEC": https://www.nlnetlabs.nl/documentation/unbound/howto-anchor/
- NLnet Labs "Howto Statistics": https://www.nlnetlabs.nl/documentation/unbound/howto-statistics/
- systemd `resolved.conf` manual: https://www.freedesktop.org/software/systemd/man/resolved.conf.html
- Red Hat Enterprise Linux documentation, "Setting up an unbound DNS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_networking_infrastructure_services/setting-up-an-unbound-dns-server
- Ubuntu package metadata for `unbound-anchor`: https://packages.ubuntu.com/noble/net/unbound-anchor
- Ubuntu package metadata for `dnsutils`: https://packages.ubuntu.com/search?keywords=dnsutils
- InterNIC root hints file: https://www.internic.net/domain/named.root
- RFC 9076, DNS Privacy Considerations: https://www.rfc-editor.org/rfc/rfc9076

## Issues Found
- The introduction said local Unbound resolves queries "directly from root servers" and that an ISP "can't log your queries." I changed this to describe recursive resolution as walking the DNS hierarchy from root servers to authoritative servers, and clarified that recursive Unbound avoids sending every query to a third-party recursive resolver but does not encrypt standard DNS traffic on the wire.
- The package installation commands omitted helper tools used later in the tutorial. I added `unbound-anchor`, `dnsutils`, and `curl` for Debian/Ubuntu, and `bind-utils` plus `curl` for CentOS/RHEL.
- The tutorial started Unbound before writing the custom configuration, root hints, trust anchor, and log directory. I changed the installation step to enable the service only, then added `unbound-checkconf` and `systemctl restart unbound` after the configuration and supporting files are created.
- The Unbound configuration used `unbound-control` commands later but did not enable remote control or generate control keys. I added a `remote-control:` section with `control-enable: yes` and added `unbound-control-setup`.
- The interface comment said the sample listened on all interfaces, but the actual directives only listened on loopback. I corrected the comment.
- The local override block would become invalid after adding a `remote-control:` clause unless the appended options re-entered the `server:` clause. I added `server:` to that appended block and indented the local-zone directives under it.
- The DNSSEC verification command grepped for the literal text `AD flag`, which `dig` does not print. I changed the grep pattern to match the `ad` flag in the `flags:` line or returned `RRSIG` records.
- The systemd-resolved section did not mention that per-link DHCP DNS servers can still be used. I added a short caveat to disable them in the active network manager when Unbound should be the only resolver path.

## Review Notes
- The Unbound directives used in the post (`interface`, `port`, `access-control`, `auto-trust-anchor-file`, `prefetch`, cache TTLs, `hide-version`, `hide-identity`, cache sizes, `root-hints`, `local-zone`, `local-data`, and `local-data-ptr`) are current and valid.
- `unbound-control stats` is valid, but by default it resets counters after printing unless `statistics-cumulative` is configured.
- The root hints URL points to the expected InterNIC `named.root` file.
