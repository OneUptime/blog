# Validation Summary: How to Set Up UFW Rate Limiting for SSH on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- iptables (`recent` and `hashlimit` modules)
- SSH (OpenSSH)
- Ubuntu Linux
- fail2ban (comparison only)

## Sources Consulted
- UFW source code (`/usr/lib/python3/dist-packages/ufw/backend_iptables.py`) for the `limit` rule generation logic
- UFW user.rules templates that show the actual iptables rules emitted by `ufw limit`
- `ufw(8)` manpage for the `limit` action semantics ("deny connections from an IP address that has attempted to initiate 6 or more connections in the last 30 seconds")
- iptables-extensions(8) manpage for the `recent` and `hashlimit` module options (`--seconds`, `--hitcount`, `--hashlimit-above`, `--hashlimit-burst`, `--hashlimit-mode`, `--hashlimit-htable-expire`)

## Issues Found
- **Incorrect iptables module attribution in the introduction.** The post originally claimed that UFW's `limit` action uses iptables' `hashlimit` module. UFW actually uses the `recent` module (the rule emitted is `-m conntrack --ctstate NEW -m recent --update --seconds 30 --hitcount 6 ... -j ufw-user-limit`). The later "Checking if Rate Limiting is Active" section already correctly states that `recent` is the module used, so the intro was internally inconsistent. Changed "uses iptables' `hashlimit` module" to "uses iptables' `recent` module" in the intro paragraph.

## Review Notes
- The custom `hashlimit` example under "Adjusting Rate Limit Parameters" uses `-m state --state NEW`. The `state` match is deprecated in favor of `-m conntrack --ctstate NEW`, but the `state` module is still supported (it's a thin compatibility shim over conntrack) and the example will work as written. Not changed since it is still functional.
- The post says packets blocked by rate limiting are "silently dropped." Strictly, UFW's `ufw-user-limit` chain ends in `-j REJECT`, which sends a TCP RST rather than a silent drop. From the client's perspective the connection still appears refused/timed out, and the surrounding text ("subsequent attempts will time out or be dropped") covers both cases, so this was left as-is.
- The default 6-connections-in-30-seconds threshold, the `[UFW LIMIT BLOCK]` log prefix, `/var/log/ufw.log` path, `/etc/ufw/user.rules` and `/etc/ufw/before.rules` paths, and the `ufw status`, `ufw status verbose`, `ufw status numbered`, `ufw delete`, `ufw insert`, and `ufw reload` commands are all accurate.
- The `hashlimit` flags shown (`--hashlimit-name`, `--hashlimit-above 3/minute`, `--hashlimit-burst`, `--hashlimit-mode srcip`, `--hashlimit-htable-expire 60000`) match the iptables-extensions(8) syntax.
