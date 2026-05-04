# Validation Summary: How to Configure systemd-resolved with systemd-networkd

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- systemd-resolved (DNS resolver)
- systemd-networkd (.network configuration)
- resolvectl (CLI)
- /etc/systemd/resolved.conf
- DNSSEC, DNS-over-TLS
- DNS stub resolver (127.0.0.53)
- dig (added during fixes)

## Sources Consulted
- resolvectl(1) man page — OPTIONS and COMMANDS sections (https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html)
- resolved.conf(5) man page — DNS=, FallbackDNS=, DNSSEC=, DNSOverTLS=, Cache=, Domains= (https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html)
- systemd.network(5) man page — [Network] DNS=, Domains= (https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html)

## Issues Found
1. **Misleading comment on `Cache=yes`**: The comment said `# Cache size`, but `Cache=` per resolved.conf(5) takes a boolean or the string `no-negative` — it is not a size. Updated the comment to `# Enable DNS caching (boolean or "no-negative")`.

2. **Invalid `--server` flag on `resolvectl query`**: `resolvectl query --server 8.8.8.8 example.com` is not valid — there is no `--server` option in resolvectl(1); resolvectl always queries via resolved's configured servers. Replaced with `dig @8.8.8.8 example.com`, which is the standard way to query a specific server directly, and updated the comment to explain the distinction.

3. **Invalid `--set-dnssec` flag on `resolvectl query`**: `resolvectl query --set-dnssec=yes example.com` is not valid. The correct flag is `--validate=BOOL` (per resolvectl(1), added in v248). Replaced with `--validate=yes`.

4. **`resolvectl dnssec` with no arguments**: The documented signature is `dnssec [LINK [MODE]]` — running it with no args is not a documented usage. Updated to `resolvectl dnssec eth0` so it shows the DNSSEC mode for a specific interface, matching the rest of the post which uses `eth0`.

## Review Notes
- The `--validate=yes` flag has a caveat in resolvectl(1): it is "only suitable to turn off such validation where otherwise enabled, not enable validation where otherwise disabled." Since the post sets `DNSSEC=yes` globally in resolved.conf earlier, validation will already be on, so the example as written is consistent.
- `DNSOverTLS=opportunistic` is valid but the systemd man page warns it is vulnerable to downgrade and MITM attacks since the server is not authenticated; readers may wish to use `yes` for stricter security.
- The `Domains=~internal.company.com` route-only domain syntax (tilde prefix) is correct per resolved.conf(5) and systemd.network(5).
- All other commands (`resolvectl status`, `resolvectl dns`, `resolvectl domain`, `resolvectl flush-caches`, `resolvectl statistics`) and config directives (`DNS=`, `FallbackDNS=`, `DNSSEC=yes`) verified against the man pages.
- The stub resolver address `127.0.0.53` and stub file path `/run/systemd/resolve/stub-resolv.conf` are correct.
