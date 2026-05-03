# Validation Summary: How to Delete nftables Rules and Chains

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nftables (nft CLI)
- Linux firewall / netfilter
- iptables (briefly, for comparison)

## Sources Consulted
- nft(8) man page (nftables v1.0.9) — TABLES, CHAINS, RULES sections
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Simple_rule_management

## Issues Found

1. **Incorrect claim that tables must be empty before deletion.** The original section "Delete an Entire Table" stated: *"Tables must be empty (all chains deleted first) to be deleted"* and presented two options including a misleading note that *"on some versions, flush is required first"*. This is incorrect: per nft(8), the `delete table` command simply "Delete[s] the specified table" with no emptiness requirement, while the `delete chain` entry explicitly requires that "The chain must not contain any rules or be used as jump target." `nft delete table` removes the table along with all chains, rules, and sets in a single atomic operation. Rewrote the section to reflect the correct behavior, contrasting it with chain deletion (which does require an empty, unreferenced chain) and clarifying that flushing is only useful if you want to keep the table itself.

## Review Notes

- The chain-deletion preconditions stated in the post ("empty and no references") are correct per the man page entry for `delete chain`.
- The example output for `nft -a list ruleset` shows handle 3 missing between handle 2 (chain) and handle 4 (first rule). This is realistic — handles are unique and monotonically increasing per table, never reused, so gaps are normal after deletions or when other objects (e.g., a previously-deleted chain) consumed intervening handle numbers.
- The example chain shows both `policy drop;` and an explicit trailing `drop` rule. Functionally redundant but not technically wrong; left as-is since it doesn't constitute an error.
- The `grep "jump mychain\|goto mychain"` pattern uses BRE alternation which works in GNU grep; portable but slightly fragile if a chain name contains regex metacharacters. Acceptable for the documentation context.
- `nft add rule` correctly appends to the end of a chain — the post's note about needing to reorder is accurate (use `nft insert rule` for the head, or `nft add rule ... position <handle>` to place after a specific rule).
- `/etc/nftables.conf` is the conventional persistent config path on Debian/Ubuntu and several other distros; on RHEL/Fedora the systemd unit may load from `/etc/sysconfig/nftables.conf` instead — a minor portability caveat worth keeping in mind but not a correctness error.
