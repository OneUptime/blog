# Validation Summary: How to Set Up LVS (Linux Virtual Server) for IPv4 Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux Virtual Server (LVS)
- IP Virtual Server (IPVS)
- ipvsadm
- IPv4 load balancing
- LVS NAT forwarding
- LVS Direct Routing
- Linux kernel ARP sysctls

## Sources Consulted
- Debian testing ipvsadm(8) manpage: https://manpages.debian.org/testing/ipvsadm/ipvsadm.8.en.html
- Debian testing ipvsadm-save(8) manpage: https://manpages.debian.org/testing/ipvsadm/ipvsadm-save.8.en.html
- Debian testing ipvsadm-restore(8) manpage: https://manpages.debian.org/testing/ipvsadm/ipvsadm-restore.8.en.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux Virtual Server direct routing documentation: https://vergenet.net/ipvs/VS-DRouting.html
- Red Hat Load Balancer Administration, Direct Routing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/load_balancer_administration/s1-lvs-direct-vsa

## Issues Found
- The LVS-DR director example configured the VIP on `lo`. LVS-DR documentation describes the load balancer as having an interface configured with the VIP to accept request packets, while real servers use a non-ARP alias/loopback approach for the VIP. Changed the director command to configure `203.0.113.100/32` on `eth0`, the client-facing interface.
- The `ipvsadm-save` command used `sudo ipvsadm-save > /etc/ipvsadm.rules`, but shell redirection would still be performed by the non-root shell and can fail for `/etc`. Changed it to `sudo sh -c 'ipvsadm-save > /etc/ipvsadm.rules'`.
- The restore example had the same redirection issue and was labeled "Restore on boot" even though the command performs a one-time restore. Changed it to `sudo sh -c 'ipvsadm-restore < /etc/ipvsadm.rules'` and relabeled the comment as "Restore rules".

## Review Notes
The remaining `ipvsadm` command flags, scheduler names, NAT mode default-gateway requirement, DR real-server VIP handling, and `arp_ignore`/`arp_announce` values were consistent with the consulted manpages and kernel documentation. The post still uses runtime-only examples for IP addresses and ARP sysctls; production setups should make interface and sysctl configuration persistent through the distribution's network and sysctl tooling.
