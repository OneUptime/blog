# Validation Summary: How to Configure Destination NAT (DNAT) with nftables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- nftables
- Linux kernel IPv4 forwarding
- Destination NAT (DNAT)
- Source NAT (SNAT)
- Masquerading
- Linux packet forwarding

## Sources Consulted
- nftables man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, Performing Network Address Translation (NAT): https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29
- nftables wiki, Matching packet metainformation: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_metainformation
- Red Hat Enterprise Linux 8 documentation, Configuring destination NAT using nftables: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/system_design_guide/securing_networks
- Linux kernel documentation, IP Sysctl (`ip_forward`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local CLI help and type inspection: `nft --help`, `nft describe iif`, `nft describe iifname`, `nft describe oif`, `nft describe oifname`, `sysctl --help`, `curl --help`, `ssh` usage output

## Issues Found
- The post used `iif` and `oif` with quoted interface names such as `"eth0"` and `"eth1"`. In nftables, `iif` and `oif` are interface-index expressions, while `iifname` and `oifname` are the interface-name expressions documented for string matches. I changed the examples and full ruleset to use `iifname` and `oifname`.
- The standalone forwarding example added a rule to `inet filter forward` without creating the `inet filter` table and `forward` base chain first. I added those creation commands so the snippet works as written.
- The verification section tested `curl http://<public-ip>:8080`, but the full ruleset shown later forwards ports `80`, `443`, and `2222`, not `8080`. I changed the verification example to `ssh -p 2222 user@<public-ip>` so it matches the full configuration.
- The full configuration comment and conclusion said `postrouting masquerade` was needed for DNAT return packets. That overstates the requirement. I rewrote the wording so `postrouting` SNAT or masquerade is described as outbound source NAT used when needed on the public interface, not as an inherent requirement of DNAT itself.

## Review Notes
- The post is IPv4-specific because it uses `table ip nat` and `net.ipv4.ip_forward`. That is technically correct for the article’s examples.
- On kernels before Linux 4.18, nftables NAT requires both `prerouting` and `postrouting` base chains to be registered for reverse translation on reply traffic. The full example already includes `postrouting`; the shorter introductory snippet assumes a modern kernel.
- A full live `nft --check` run was not possible in this environment because netlink operations require privileges, so syntax and behavior were validated against official documentation plus local `nft` type inspection and CLI help output.
