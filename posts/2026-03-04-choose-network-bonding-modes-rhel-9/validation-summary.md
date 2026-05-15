# Validation Summary: How to Choose Between Network Bonding Modes on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux network bonding
- NetworkManager
- nmcli
- LACP / IEEE 802.3ad

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring a network bond: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Linux kernel bonding driver documentation: https://docs.kernel.org/networking/bonding.html
- Local `nmcli --help` output for command syntax availability.

## Issues Found
- The 802.3ad recommendation implied general throughput improvement. Updated it to specify aggregate throughput across multiple flows, because LACP/hash-based aggregation does not normally increase a single flow's bandwidth.
- The balance-alb section said it only works with IPv4. RHEL 9 documentation describes balance-alb receive-load balancing for IPv4 and IPv6 traffic, so the IPv4-only wording was removed and replaced with a neighbor-discovery caveat.
- The hash-policy section said `xmit_hash_policy` applied only to balance-xor and 802.3ad. RHEL 9 documents that it also applies to balance-tlb and balance-alb when `tlb_dynamic_lb=0`, so the scope was corrected.
- The `layer2` policy guidance said it was good if all traffic goes to one gateway. Red Hat documents `layer2` as the primary choice for multiple peers in the same broadcast domain and `layer2+3` as better when traffic goes through a default gateway, so those recommendations were corrected.
- The `layer3+4` policy was described as best for most workloads without caveat. Red Hat and Linux bonding documentation note that it is not 802.3ad compliant, so that caveat was added.

## Review Notes
The `nmcli connection add type bond ... bond.options "mode=...,miimon=..."` examples match Red Hat's documented syntax. The examples create only the bond profile; a complete deployment still needs bond port profiles and IP configuration, which is outside the scope of this comparison post.
