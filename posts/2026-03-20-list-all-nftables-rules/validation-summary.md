# Validation Summary: How to List All nftables Rules

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- nftables
- Linux firewall administration
- JSON output parsing with `jq`
- Shell commands

## Sources Consulted
- Netfilter `nft(8)` man page: https://netfilter.org/projects/nftables/manpage.html
- Netfilter wiki, "Operations at ruleset level": https://wiki.nftables.org/wiki-nftables/index.php/Operations_at_ruleset_level
- Netfilter wiki, "Output text modifiers": https://wiki.nftables.org/wiki-nftables/index.php/Output_text_modifiers
- Netfilter wiki, "Counters": https://wiki.nftables.org/wiki-nftables/index.php/Counters
- Netfilter wiki, "Configuring tables": https://wiki.nftables.org/wiki-nftables/index.php/Configuring_tables
- Local `nft --help`
- Local `libnftables-json(5)` man page

## Issues Found
- The post described nftables handles as "line numbers." I changed this to "numeric identifiers" because handles are identifiers used to target objects and rules, not line numbers.
- The backup example used `sudo nft list ruleset > /etc/nftables.conf`, which does not elevate the shell redirection and did not include `flush ruleset` for a self-contained restore file. I changed it to write through `sudo tee`, prepend `flush ruleset`, and keep the restore command with `nft -f`.
- The counters section claimed `sudo nft list ruleset | grep -v "^#"` would show counters. I replaced this with `nft list ruleset` for per-rule counters, added `nft list counters` for named counters, and clarified that packet/byte values only appear when the rule includes a `counter` statement.
- The `jq` example used `.nftables[].rule | .chain, .expr`, which can emit null values because the JSON array contains metainfo and non-rule objects. I changed it to select only `.rule` objects before extracting fields.
- The "count total rules" example counted only lines containing `accept`, `drop`, or `reject`, which is not equivalent to counting rules. I replaced it with a JSON-based count of rule objects.
- The `grep` examples for `accept` and `drop`/`reject` were phrased as if they returned only rules. I adjusted the wording to "lines mentioning ..." so the description matches the command output.

## Review Notes
- `inet nat` examples are valid on modern nftables/Linux systems, but older systems may use `ip nat` or `ip6 nat` instead.
- Live `nft list ruleset` verification was not possible in this environment because the process lacks root netlink access, so command behavior was verified against the official man pages, `nft --help`, and the nftables project wiki.
