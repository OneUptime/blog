# Validation Summary: How to Troubleshoot DNS Resolution Failures on RHEL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNS resolution and recursive resolvers
- BIND utilities: dig and rndc
- NetworkManager and nmcli
- systemd-resolved and resolvectl
- firewalld
- SELinux audit troubleshooting
- Linux name service switch and /etc/hosts

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- BIND 9 manual pages for dig and rndc: https://bind9.readthedocs.io/en/v9.18.33/manpages.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- RFC 8482, Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://www.rfc-editor.org/rfc/rfc8482
- Local command help output for nmcli, resolvectl, ss, systemctl, journalctl, and dig

## Issues Found
- The TCP reachability example used `ss -tlnp | grep :53`, which only lists local listening TCP sockets and does not test whether a remote DNS server is reachable. Changed it to `dig @your-dns-server example.com +tcp +timeout=5`, which actually sends a DNS query over TCP to the target resolver.
- The netcat example used UDP scan mode with `nc -zvu your-dns-server 53`. UDP port probing is unreliable for confirming DNS reachability and duplicates the preceding `dig` UDP test. Changed it to `nc -zv your-dns-server 53` and clarified that it checks TCP port reachability.
- The NXDOMAIN section suggested `dig example.com ANY` to verify whether a name exists. RFC 8482 allows authoritative servers to return minimal responses to QTYPE=ANY, so this is not a reliable troubleshooting check. Replaced it with explicit `A`, `AAAA`, and `SOA` queries.

## Review Notes
The remaining commands and explanations are technically reasonable for a RHEL 9 DNS troubleshooting guide. Some examples, such as the NetworkManager connection name `System eth0`, are placeholders and may need adjustment on real hosts, but the nmcli properties and command structure are valid.
