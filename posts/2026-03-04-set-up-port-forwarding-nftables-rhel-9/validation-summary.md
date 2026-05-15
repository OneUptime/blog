# Validation Summary: How to Set Up Port Forwarding with nftables on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- nftables
- Linux network address translation
- Destination NAT
- Source NAT and masquerading
- Linux IP forwarding
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- nftables project man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki: Performing Network Address Translation: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29
- nftables wiki: Netfilter hooks: https://wiki.nftables.org/wiki-nftables/index.php/Netfilter_hooks
- Local command reference: `nft --help` and `man nft` from nftables v1.0.9

## Issues Found
- The prerouting chain creation command used `nft add chain ... priority -100` without `--`. Red Hat's RHEL 9 nftables documentation notes that the `--` option is required so the negative priority is not interpreted as an option to `nft`. Changed the command to `sudo nft -- add chain ip nat prerouting { type nat hook prerouting priority -100 \; }`.
- The explanation for the NAT priorities said they ran before or after the filter chain. This was imprecise because prerouting NAT and forward filtering are different hooks; the priority values register the chains at destination NAT and source NAT priority. Updated the comments to describe `dstnat` and `srcnat` priority placement.
- The persistence instructions used `/etc/nftables.conf` as the default RHEL configuration file. RHEL 9's nftables service loads scripts included from `/etc/sysconfig/nftables.conf`, with custom scripts typically stored under `/etc/nftables/`. Updated the commands and include example to save `/etc/nftables/port-forwarding.nft` and include it from `/etc/sysconfig/nftables.conf`.

## Review Notes
The remaining nftables DNAT, masquerade, filter-chain, `sysctl`, `systemctl`, `curl`, `nc`, `dig`, and `tcpdump` examples are technically plausible for the scenario described. Real deployments must adjust interface names, routed networks, and whether SNAT/masquerade is necessary based on the internal server's return route.
