# Validation Summary: How to Configure Pi-hole for IPv6 DNS Filtering

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Pi-hole (DNS-based ad blocker)
- Pi-hole FTL (forked dnsmasq)
- dnsmasq configuration syntax
- IPv6 / AAAA DNS records
- DHCPv6 and Router Advertisements (RA)
- Cloudflare IPv6 DNS resolvers (2606:4700:4700::1111 / ::1001)
- systemd (pihole-FTL service)
- `dig` for DNS verification

## Sources Consulted
- Pi-hole official documentation: https://docs.pi-hole.net/
- Pi-hole FTL blocking mode docs: https://docs.pi-hole.net/ftldns/blockingmode/
- Pi-hole GitHub source (pi-hole/pi-hole): https://github.com/pi-hole/pi-hole
- Pi-hole v6 release notes and migration documentation
- dnsmasq man page (for `address=/domain/IP` syntax and `listen-address`)
- PADD repository: https://github.com/pi-hole/PADD
- Pi-hole installer one-liner: https://install.pi-hole.net

## Issues Found

1. **`pihole -a setdns ...` is not a real command.** The Pi-hole CLI has never had a `setdns` subcommand. Upstream DNS is configured via the admin UI, by editing `setupVars.conf` (v5) / `pihole.toml` (v6), or via the API.
   - **Fix:** Replaced the bogus CLI invocation with admin-UI guidance, and updated the verification step to show both v5 (`/etc/dnsmasq.d/01-pihole.conf`) and v6 (`/etc/pihole/pihole.toml`) inspection paths.

2. **AAAA blocked-response value was wrong.** The post claimed a blocked AAAA query returns `0.0.0.0` — that is the IPv4 NULL-mode response. For AAAA queries in NULL mode, Pi-hole returns `::` (the IPv6 unspecified address); per docs.pi-hole.net/ftldns/blockingmode.
   - **Fix:** Updated the comment after `dig AAAA ads.google.com @2001:db8::1` to state the response is `::` in NULL mode (or NXDOMAIN in NXDOMAIN mode).

3. **`pihole -c` (chronometer) has been removed.** Current Pi-hole prints "Chronometer is gone, use PADD." Recommending it as a verification step is incorrect on modern installs.
   - **Fix:** Replaced `pihole -c  # chronometer` with a comment pointing to PADD, and kept `pihole status` as the working CLI status command.

4. **`pihole -w` / `pihole -b` flags were removed in Pi-hole v6.** The current allow/deny CLI uses the explicit verbs `pihole allow <domain>` and `pihole deny <domain>` (`--regex` is still valid).
   - **Fix:** Updated the Whitelist/Blacklist section to use `pihole allow` and `pihole deny` and re-labelled the comments accordingly.

## Review Notes
- The post does not declare a target Pi-hole version. The fixes preserve compatibility with the post's narrative while bringing the commands into line with current Pi-hole (v6) behavior. The legacy v5 path `/etc/dnsmasq.d/01-pihole.conf` is retained but explicitly labelled as the v5 location, with the v6 (`/etc/pihole/pihole.toml`) location shown alongside.
- The custom dnsmasq snippet in Step 4 (`/etc/dnsmasq.d/05-pihole-custom-cname.conf` with `address=/<domain>/<IPv6>`) still works on Pi-hole v6 because user-supplied dnsmasq configs in `/etc/dnsmasq.d/` are still loaded by the embedded resolver, even though the Pi-hole-managed config files have moved to `pihole.toml`. Left unchanged.
- `dig AAAA doubleclick.net @2001:db8::1` returning NXDOMAIN/`::` depends on the configured blocking mode and on whether the domain is in the active gravity blocklists, but the example domains used (`doubleclick.net`, `ads.google.com`) are conventional advertising/tracking domains commonly present in the default lists and are reasonable illustrative examples.
- Pi-hole's installer one-liner (`curl -sSL https://install.pi-hole.net | bash`) is the official documented method.
- The Cloudflare IPv6 resolver addresses (`2606:4700:4700::1111`, `2606:4700:4700::1001`) are correct.
- The conclusion mentioning OneUptime monitoring is editorial/promotional, not technical.
