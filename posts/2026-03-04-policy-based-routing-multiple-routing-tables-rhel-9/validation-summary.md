# Validation Summary: How to Set Up Policy-Based Routing with Multiple Routing Tables on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux policy-based routing
- iproute2 `ip route` and `ip rule`
- NetworkManager and `nmcli`
- nftables packet marking
- traceroute

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring policy-based routing to define alternative routes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-policy-based-routing-to-define-alternative-routes_configuring-and-managing-networking
- NetworkManager nm-settings-nmcli reference for `ipv4.routes`, `ipv4.routing-rules`, and route table attributes: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- iproute2 `ip-rule(8)` manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- nftables man page for `meta mark set`: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki for chain hooks and prerouting/output behavior: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains

## Issues Found
- The Step 4 heading said "Source Port or Protocol", but the example matches `tcp dport 80`, which is destination-port matching. Changed the heading to "Destination Port or Protocol".
- The Step 4 comments said packets were marked with iptables, but the commands use `nft`. Changed the comment to nftables.
- The Step 4 comment said the rule routes all HTTP traffic. A prerouting hook applies to incoming packets before routing, including forwarded traffic, but not locally generated output traffic. Changed the wording to "incoming or forwarded HTTP traffic".
- The persistence section only added the NetworkManager route and routing rule for `ens3`/table 100. Added matching `ens4`/table 200 commands and verification so the persistent configuration matches the two-table setup described earlier.

## Review Notes
The `ip route` and `ip rule` examples are valid as temporary runtime commands. For production RHEL 9 systems managed by NetworkManager, the persistent `nmcli` approach is preferred, and NetworkManager routing rules must include a fixed priority.
