# Validation Summary: How to Create Custom nftables Tables and Chains on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- nftables
- nft command-line utility
- Netfilter tables, chains, hooks, priorities, sets, and verdicts

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters - Creating and managing nftables tables, chains, and rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters
- nftables man page for nftables v1.0.9 (`man nft`) installed locally
- nft command help for nftables v1.0.9 (`nft --help`) installed locally
- nftables wiki: Jumping to chain: https://wiki.nftables.org/wiki-nftables/index.php/Jumping_to_chain
- nftables wiki: Configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains

## Issues Found
- The post described regular chains as only executing when another chain jumps to them. Updated this to include both `jump` and `goto`, because nftables supports both verdicts for transferring evaluation to another chain.
- The chain type list described `route` too broadly. Updated it to specify that `route` chains apply to `ip` and `ip6` output chains, matching Red Hat and nft documentation.
- The hook list omitted the `inet` family `ingress` hook available on RHEL 9-era kernels. Added a short note that `inet` supports `ingress`, that it runs before `prerouting`, and that ingress chains require a device parameter.
- The "List all chains in a table" command used `nft list chains inet server_firewall`, but `list chains` is family-scoped and does not take a table argument. Replaced it with `nft list table inet server_firewall`, which correctly lists the chains and rules in the table.

## Review Notes
The extracted nftables configuration was checked with `nft -c -f`, but the local environment lacks the required netlink privileges, so nft returned "Operation not permitted" while parsing/evaluating the ruleset. No nft syntax errors were reported before the permission failures. Administrators should also ensure `firewalld` and direct `nftables` management are not active at the same time on RHEL, as Red Hat recommends running only one firewall service to avoid conflicts.
