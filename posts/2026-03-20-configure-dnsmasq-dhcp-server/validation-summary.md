# Validation Summary: How to Configure dnsmasq as a DHCP Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- dnsmasq
- DHCP
- DNS forwarding
- Linux service management with `systemctl`
- Debian/Ubuntu package management with `apt`
- RHEL/Fedora package management with `dnf`

## Sources Consulted
- dnsmasq man page: https://dnsmasq.org/docs/dnsmasq-man.html
- dnsmasq setup guide: https://dnsmasq.org/docs/setup.html
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762
- RFC 8375, Special-Use Domain `home.arpa.`: https://www.rfc-editor.org/rfc/rfc8375
- Ubuntu package page for `dnsmasq`: https://packages.ubuntu.com/noble/dnsmasq
- Fedora package page for `dnsmasq`: https://packages.fedoraproject.org/pkgs/dnsmasq/dnsmasq
- ISC DHCP product page and EOL notice: https://www.isc.org/dhcp
- ISC DHCP `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf

## Issues Found
- The post used `home.local` as the sample local DNS domain. That is technically problematic because `.local.` is reserved for mDNS by RFC 6762. I changed the sample domain to `home.arpa`, which RFC 8375 designates for home-network naming.
- After switching to `home.arpa`, the sample still needed to keep that zone local. I added `local=/home.arpa/` so dnsmasq will not forward `home.arpa` queries upstream.
- The `bind-interfaces` comment was misleading. I corrected it to reflect dnsmasq's documented behavior: it forces dnsmasq to really bind only the configured interfaces.
- The `bogus-priv` comment was inaccurate. I corrected it to describe what dnsmasq actually does: it stops forwarding private reverse-lookups upstream.
- The `domain-needed` comment was too broad. I corrected it to match the man page: it suppresses forwarding plain A/AAAA names without dots.
- The test command used `server1.home.local`; I updated it to `server1.home.arpa` to match the corrected configuration.
- The `log-dhcp` takeaway overstated its behavior. I changed it to say it enables extra DHCP logging for debugging.
- The `dnsmasq vs ISC dhcpd` comparison implied ISC DHCP was a current general enterprise recommendation. I adjusted the wording to `Legacy deployments needing failover`, because ISC DHCP is end-of-life and not recommended for new deployments.

## Review Notes
- The corrected main configuration and the multi-VLAN snippet both passed local syntax checks with `dnsmasq --test --conf-file=-`.
- `dnsmasq --help dhcp` on the local system confirms the option names used in the post, including `router`, `dns-server`, `domain-name`, and `ntp-server`.
- `dnsmasq --address` changed behavior for non-A/AAAA queries in version 2.86, but the post's example `dig` lookup is an A-record query, so the sample remains valid as written.
