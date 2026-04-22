# Validation Summary: How to Save and Restore nftables Rules Across Reboots

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- nftables
- Linux firewall configuration
- systemd services
- Debian/Ubuntu package defaults
- Shell commands

## Sources Consulted
- nftables wiki: Operations at ruleset level - https://wiki.nftables.org/wiki-nftables/index.php/Operations_at_ruleset_level
- nftables wiki: Atomic rule replacement - https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement
- Debian nftables(8) man page - https://manpages.debian.org/trixie/nftables/nftables.8.en.html
- Debian nftables wiki - https://wiki.debian.org/nftables
- systemctl(1) man page - https://man7.org/linux/man-pages/man1/systemctl.1.html
- Red Hat Enterprise Linux nftables documentation - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/getting-started-with-nftables_configuring-and-managing-networking
- Local command output from `nft --help`, `man nft`, and `systemctl cat nftables`

## Issues Found
- The original save commands wrote only `nft list ruleset` to `/etc/nftables.conf`. Official nftables backup/restore guidance prepends `flush ruleset` before the listed ruleset so reloads replace the active ruleset cleanly. Updated both save examples and the conclusion to include a leading `flush ruleset`.
- The post implied that every `nftables.service` reads `/etc/nftables.conf`. This is true for Debian/Ubuntu-style packaging, but some distributions use different paths. Updated the wording to scope the claim and tell readers to check `systemctl cat nftables`.
- The atomic replacement example wrote the temporary file under `/tmp` and then moved it into `/etc`. Because `/tmp` may be a different filesystem, that move is not guaranteed to be atomic. Updated the example to create the temporary file in `/etc`.
- The Debian/Ubuntu note referred to "older Debian systems" in a way that could confuse the current default. Updated it to state the usual Debian/Ubuntu default and keep the unit-file check.

## Review Notes
The shell snippets added during review passed `bash -n`. The local `nft --check -f -` ruleset validation was blocked by missing netfilter privileges in the review environment (`Operation not permitted`), but the command and option are valid per nftables documentation and local `nft --help`.
