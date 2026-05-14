# Validation Summary: How to Troubleshoot nftables Rules Not Working on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- nftables
- firewalld
- systemd and journalctl
- SELinux audit troubleshooting
- iproute2 networking commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Red Hat Enterprise Linux 9 documentation, Using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- nftables wiki, Ruleset debug/tracing: https://wiki.nftables.org/wiki-nftables/index.php/Ruleset_debug/tracing
- nftables wiki, Nftables families: https://wiki.nftables.org/wiki-nftables/index.php/Nftables_families
- Local CLI help output for `nft` v1.0.9, `journalctl`, `systemctl`, and `iproute2`

## Issues Found
- The firewalld section implied that firewalld rules are always evaluated first and then custom nftables rules are evaluated. Red Hat documents that firewalld and nftables services should not both manage firewall rules because they can influence each other. Updated the text and diagram to avoid a deterministic evaluation-order claim and describe the conflict in terms of hooks, priorities, and policies.
- The counter debugging example used `sed` to rewrite every `accept` and `drop` token in `nft list ruleset` output. That can produce invalid rulesets, for example by changing `policy drop` to `policy counter drop`, and can also rewrite unintended text. Replaced it with the documented handle-based `nft replace rule ... counter ...` approach.
- The tracing example added `meta nftrace set 1` in the same input chain being debugged. That only starts tracing after the packet reaches that rule and can miss earlier rules. Replaced it with a temporary early prerouting trace chain, matching the nftables tracing guidance.

## Review Notes
The remaining commands and examples are technically appropriate for a RHEL 9 nftables troubleshooting guide. Some examples assume the `inet firewall` table and `input` chain already exist, which is consistent with the surrounding tutorial context.
