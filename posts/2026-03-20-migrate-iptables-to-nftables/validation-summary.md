# Validation Summary: How to Migrate Firewall Rules from iptables to nftables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables
- iptables / xtables compatibility tools
- Linux firewall management
- systemd service management

## Sources Consulted
- Ubuntu Security Documentation: nftables — https://documentation.ubuntu.com/security/security-features/network/firewall/nftables/
- nftables wiki: Moving from iptables to nftables — https://wiki.nftables.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables
- nftables wiki: Configuring chains — https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki: Atomic rule replacement — https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement
- Debian Manpages: iptables-restore-translate(8) — https://manpages.debian.org/testing/iptables/iptables-restore-translate.8.en.html
- Debian Manpages: iptables-save(8) — https://manpages.debian.org/testing/iptables/iptables-save.8.en.html
- Local CLI help output: `iptables-translate --help`, `iptables-restore-translate --help`, `nft --help`

## Issues Found
1. The Step 2 example used `iptables -A ...` as if it were a translation command. That command would append a live firewall rule instead of translating it. I changed it to `iptables-translate` and updated the shown output to match current tool behavior.

2. The Step 3 bulk-translation command was incorrect. `iptables-restore-translate` requires `-f <FILE>`; piping `iptables-save` into `iptables-restore-translate -f` without a filename fails. I changed it to translate the saved `/tmp/iptables-backup.txt` file directly.

3. The original Step 5 mixed native `nftables` management with `iptables-nft` backend switching and described that as “disabling iptables.” Ubuntu’s official docs explicitly warn not to combine `iptables-nft` with native `nftables` management. I removed the `update-alternatives` commands and replaced the step with native `nftables` persistence.

4. Copying the raw translated `add ...` file directly to `/etc/nftables.conf` was not a reload-safe persistence method. I changed the post to prepend `flush ruleset`, save the full translated ruleset, and restart `nftables.service` after writing it.

5. The Step 6 `iptables-legacy -L` check was not a reliable way to validate a native `nftables` migration. I replaced it with `systemctl is-enabled` and `systemctl is-active` checks for `nftables.service`.

6. The closing warning singled out `--state` as a likely manual-adjustment case even though it translates cleanly to `ct state` in current tooling. I changed that note to warn more generally about custom chains, NAT rules, and extensions that may not translate cleanly.

## Review Notes
- The post is intentionally IPv4-only, and the examples correctly use the `ip` family. Readers who want a unified IPv4/IPv6 ruleset should migrate to an `inet` table rather than reusing the IPv4-only examples as-is.
- The declarative nftables example in the post is valid syntax, even though `iptables-restore-translate` itself emits imperative `add table` / `add chain` / `add rule` commands.
- `iptables-restore-translate` is a text-conversion tool, not a verifier. Complex or unsupported xtables extensions still need manual review after translation.
- The persistence step now assumes native `nftables` is the only manager of the host firewall ruleset, which matches Ubuntu’s guidance not to mix native `nftables` management with `iptables-nft` or other competing frontends.
