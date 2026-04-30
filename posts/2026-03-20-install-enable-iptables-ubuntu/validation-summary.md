# Validation Summary: How to Install and Enable iptables on Ubuntu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ubuntu
- iptables / ip6tables
- iptables-save / iptables-restore
- iptables-persistent / netfilter-persistent
- Linux netfilter / nftables backend

## Sources Consulted
- Debian Manpages: `iptables(8)` — https://manpages.debian.org/testing/iptables/iptables.8.en.html
- Ubuntu Manpages: `xtables-nft(8)` — https://manpages.ubuntu.com/manpages/jammy/man8/xtables-nft.8.html
- Ubuntu Manpages: `iptables-extensions(8)` — https://manpages.ubuntu.com/manpages/jammy/man8/iptables-extensions.8.html
- Ubuntu Manpages: `iptables-save(8)` — https://manpages.ubuntu.com/manpages/focal/man8/iptables-save.8.html
- Ubuntu Manpages: `netfilter-persistent(8)` — https://manpages.ubuntu.com/manpages/focal/man8/netfilter-persistent.8.html
- firewalld Documentation — https://firewalld.org/documentation/
- firewalld: nftables backend — https://firewalld.org/2018/07/nftables-backend

## Issues Found
- The post said iptables has "Three default tables," but current iptables documentation defines five built-in tables: `filter`, `nat`, `mangle`, `raw`, and `security`. I corrected the table list to match the documented behavior.
- The firewall examples used `-m state --state ESTABLISHED,RELATED`. Current iptables documentation describes `state` as a subset of `conntrack`, so I updated the examples to use `-m conntrack --ctstate ESTABLISHED,RELATED`.
- The "Test Before Applying Default-Deny" example set the `INPUT` policy to `DROP` after only adding an SSH allow rule. I added loopback and established/related rules first so the snippet reflects a safer default-deny transition.
- The command `sudo iptables-save > /etc/iptables/rules.v4` was incorrect because shell redirection happens before `sudo`. I replaced it with `sudo iptables-save -f /etc/iptables/rules.v4`, which is supported by `iptables-save`.
- The article described a general firewall setup while only configuring `iptables`, which applies to IPv4 only. I clarified that equivalent `ip6tables` rules are needed when IPv6 is enabled.
- The closing paragraph said UFW and firewalld generate iptables rules underneath. I updated that explanation to reflect modern systems, where higher-level tools often manage the same netfilter framework through nftables instead.

## Review Notes
- The setup script ends with an `INPUT` chain `DROP` rule instead of changing the default `INPUT` policy. That is technically valid for the demonstrated ruleset, but any later `INPUT` allow rules would need to be inserted above the final `DROP` rule to take effect.
- The GitHub author URL resolves correctly.
