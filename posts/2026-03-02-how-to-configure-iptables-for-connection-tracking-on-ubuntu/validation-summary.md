# Validation Summary: How to Configure iptables for Connection Tracking on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux netfilter
- iptables
- conntrack / nf_conntrack
- sysctl
- netfilter-persistent / iptables-persistent

## Sources Consulted
- Linux kernel documentation: Netfilter Conntrack Sysfs variables, https://docs.kernel.org/networking/nf_conntrack-sysctl.html
- Linux kernel 5.17 documentation: nf_conntrack_helper behavior, https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html
- Ubuntu conntrack(8) man page, https://manpages.ubuntu.com/manpages/jammy/man8/conntrack.8.html
- Netfilter conntrack-tools conntrack(8) page, https://conntrack-tools.netfilter.org/conntrack.html
- Local iptables-extensions(8) man page for iptables v1.8.10
- Local iptables command help for the conntrack match and CT target
- Local kernel module metadata via modinfo for nf_conntrack and nf_conntrack_ftp

## Issues Found
- The FTP helper example implied that loading `nf_conntrack_ftp` plus a `RELATED` rule is sufficient. Kernel documentation for `nf_conntrack_helper` says automatic helper assignment is disabled by default when that sysctl is present, and iptables documents the `CT --helper` target for assigning helpers, so I added an explicit raw-table `CT --helper ftp` rule for FTP control connections before the `RELATED` rule.
- The conntrack bucket sizing guidance said the bucket count "should be max/4". Current kernel documentation states that `nf_conntrack_max` defaults to `nf_conntrack_buckets`, with entries added for both original and reply directions. I changed the example bucket value to match the max value and described it as the hash table size rather than a fixed max/4 rule.
- The command to delete TIME_WAIT entries used `conntrack -D --state TIME_WAIT` without specifying TCP. The conntrack man page documents `--state` under TCP-specific protocol parameters, so I changed it to `conntrack -D -p tcp --state TIME_WAIT`.

## Review Notes
- The post uses iptables even though Ubuntu's iptables command commonly runs through the nf_tables backend on current releases. The iptables syntax shown remains valid through iptables-nft compatibility.
- The `state` match is older and is a subset of the `conntrack` match, but it remains documented and usable. The post already recommends the newer `conntrack` match as an alternative.
