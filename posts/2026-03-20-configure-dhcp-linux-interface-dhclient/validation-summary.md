# Validation Summary: How to Configure DHCP on a Linux Network Interface Using dhclient

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking
- DHCP / DHCPv4
- `dhclient`
- `dhclient.conf`
- `systemd-networkd`

## Sources Consulted
- ISC DHCP 4.4 Manual Pages: `dhclient` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 Manual Pages: `dhclient.conf` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP 4.4.3 Manual Pages: `dhclient-script` — https://kb.isc.org/docs/isc-dhcp-443-manual-pages-dhclient-script
- `systemd.network` manual — https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- RFC 2131: Dynamic Host Configuration Protocol — https://datatracker.ietf.org/doc/html/rfc2131
- ISC DHCP end-of-life notice — https://www.isc.org/dhcp/

## Issues Found

1. **The hook path was presented as a generic `dhclient` interface, but the documented ISC hook entrypoint is `/etc/dhcp/dhclient-enter-hooks`.** The original post used `/etc/dhcp/dhclient-enter-hooks.d/`, which is a distro-specific extension and not the generic interface documented in ISC's `dhclient-script` manual page. Updated the text and example to use `/etc/dhcp/dhclient-enter-hooks`.

2. **The hook example used a Bash shebang even though `dhclient-script` documents the hook as being sourced by the Bourne shell.** Changed `#!/bin/bash` to `#!/bin/sh` to keep the example aligned with the documented hook mechanism and portable across systems that invoke the hook with `/bin/sh`.

## Review Notes
- The `request` statement in `dhclient.conf` is technically valid, but it replaces the default parameter request list. Readers who want to keep the defaults and add more requested options would need `also request` instead.
- ISC has ended development of the ISC DHCP client. The post remains technically usable for systems that still ship `dhclient`, but new production deployments should prefer the distribution-supported network stack and tools.
