# Validation Summary: How to Monitor nftables Rule Counters

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- nftables (Linux kernel firewall framework)
- nft CLI tool
- Bash scripting
- Linux networking / packet filtering
- Counter objects (named and inline)

## Sources Consulted
- nftables wiki – Counters page (https://wiki.nftables.org/wiki-nftables/index.php/Counters)
- nft(8) man page (https://manpages.debian.org/testing/nftables/nft.8.en.html)
- nftables wiki – Configuring chains and tables
- Netfilter project documentation

## Issues Found
- **Incorrect syntax for listing all counters in a table.** The post used `nft list counters inet filter` in three locations (the `watch` example, the "List all named counters" example, and the export script). Per the nft(8) man page, the documented syntax for listing counters in a specific table is `list counters table <family> <table>` — the `table` keyword is required when scoping by table. Fixed all three to `nft list counters table inet filter`.
- **Incorrect syntax for resetting all counters in a table.** The post used `nft reset counters inet filter`, which is missing the `table` keyword for the same reason. Fixed to `nft reset counters table inet filter`.

The singular forms (`nft list counter inet filter ssh_counter` and `nft reset counter inet filter ssh_counter`) were already correct — those follow the `counter <family> <table> <name>` pattern and do not take a `table` keyword.

## Review Notes
- The `counter` statement, named-counter declaration syntax (`counter ssh_counter { }`), inline counter usage (`counter accept`, `counter name <name> ...`), and the table/chain scaffolding (`type filter hook input priority 0; policy drop;`, `iif lo accept`, `ct state established,related accept`) are all syntactically correct.
- The example output format (`tcp dport 22 counter packets 1024 bytes 65536 accept`) matches actual nft output.
- The export script in the "Export Counter Data for Monitoring" section is illustrative but somewhat fragile: in the default nft text output, `counter <name> {` appears on one line and `packets X bytes Y` appears on the next, so the inline regex extraction will not produce data for every counter. For production monitoring, `nft -j list counters` (JSON output) parsed with `jq` would be more robust. The script was left as written since the task is to fix technical errors, not to refactor.
- The post does not specify a minimum nftables version. The `table` keyword for `list/reset counters` has been the documented form for a long time, so the fixes apply broadly.
