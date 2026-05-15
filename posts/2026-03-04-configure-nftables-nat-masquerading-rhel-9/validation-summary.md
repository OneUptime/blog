# Validation Summary: How to Configure nftables for NAT and Masquerading on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- nftables
- Netfilter NAT
- Masquerading, SNAT, DNAT, and redirect rules
- Linux IP forwarding
- conntrack-tools
- systemd nftables service configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- nftables man page from netfilter.org: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, "Performing Network Address Translation (NAT)": https://wiki.netfilter.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29
- conntrack-tools man page from netfilter.org: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- Local nftables CLI syntax check with nftables v1.0.9

## Issues Found
- The SNAT and DNAT examples used IPv4 address literals in `table inet` NAT rules without the required `ip` family prefix. In nftables `inet` family chains, `snat` and `dnat` statements with literal addresses must disambiguate with `ip` or `ip6`. Updated the SNAT command and all DNAT examples to use `snat ip to ...` and `dnat ip to ...`.
- The testing section used `conntrack -L -n`. In conntrack-tools, `-n` is the short option for `--src-nat`, not a numeric-output flag. Changed the general connection tracking table command to `conntrack -L`.

## Review Notes
- The nftables service persistence example matches the RHEL documented approach of including scripts from `/etc/sysconfig/nftables.conf`.
- `nft -c` syntax checks in this container cannot fully apply netlink validation without elevated network administration capability, so the remaining parser check reports `Operation not permitted` after syntax validation. The original `inet` NAT ambiguity was reproducible before the fix and no longer appears after the change.
