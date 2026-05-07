# Validation Summary: How to Understand 6rd (IPv6 Rapid Deployment) for ISPs

## Status
validated

## Post Type
Guide / technical explainer

## Technologies Covered
- 6rd (IPv6 Rapid Deployment)
- IPv6 over IPv4 tunneling
- 6to4
- DHCPv4 option 212
- Linux `iproute2` / `ip tunnel`
- `radvd`
- `iptables` / `ip6tables`

## Sources Consulted
- RFC 5969: IPv6 Rapid Deployment on IPv4 Infrastructures (6rd) -- Protocol Specification — https://www.rfc-editor.org/rfc/rfc5969
- RFC 5569: IPv6 Rapid Deployment on IPv4 Infrastructures (6rd) — https://www.rfc-editor.org/rfc/rfc5569
- RFC 7526: Deprecating the Anycast Prefix for 6to4 Relay Routers — https://www.rfc-editor.org/rfc/rfc7526.html
- Comcast IPv6 trial experience draft — https://datatracker.ietf.org/doc/html/draft-jjmb-v6ops-comcast-ipv6-experiences-02
- `radvd.conf(5)` Debian man page — https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- Local `ip tunnel help` and `man ip-tunnel`
- Local `iptables --help` and `ip6tables --help`
- Local `/etc/protocols` and `getent protocols 41`

## Issues Found
- The historical deployment date was wrong. The post said Free deployed 6rd in 2008, but RFC 5569 documents Free's rollout in late 2007. I corrected the timeline and referenced RFC 5569 in the overview and deployment section.
- The `IPv4MaskLen` explanation was incorrect. RFC 5969 defines it as the number of common high-order IPv4 bits stripped before embedding, not the number of bits embedded. I corrected the explanation, added the delegated-prefix formula, and fixed both derivation examples.
- The DHCPv4 option 212 field list was incomplete and inaccurate. The draft omitted `6rdPrefixLen` and described `IPv4MaskLen` incorrectly. I updated the field list and clarified that the BR field may contain one or more addresses.
- The Linux `ip tunnel` example used invalid 6rd CLI syntax. Current `iproute2` uses `6rd-prefix` and `6rd-relay_prefix`; the original `relay prefix ... mappedlen` form does not match the CLI. I corrected the commands to match the local `ip tunnel help` output.
- The shell example derived the sample IPv4 hex value incorrectly and produced invalid IPv6 text when concatenating a prefix that already ended in `::`. I fixed the conversion logic, normalized the sample prefix handling, and verified the resulting `CE_PREFIX` and `BR6` values with the sample addresses.
- The default route example was wrong. The original `ip route add ::/0 via ::$BR dev 6rd` was not valid 6rd routing. I changed it to an IPv6 default route via the BR's derived 6rd IPv6 address and added the direct route for the 6rd domain prefix, which matches the RFC's routing model.
- The deployment section overstated or dated some claims. I corrected Free to 2007, changed Comcast to accurately reflect 6rd technology trials and native dual-stack rollout, and softened the generic operator bullet to avoid unsupported specificity.
- The firewall example used an overly narrow IPv6 source prefix. For the sample `2001:db8::/32` 6rd domain, blocking `2001:db8:c000::/36` does not cover the full example domain. I corrected it to `2001:db8::/32`.

## Review Notes
- The `radvd` example syntax is valid as written for advertising the sample `/64`.
- The Linux manual configuration example is accurate for the specific sample parameters shown (`6rdPrefixLen=32`, `IPv4MaskLen=0`). Different 6rd prefix lengths or non-zero relay prefixes require different address derivation and relay-prefix values.
- The firewall examples use `iptables` and `ip6tables`, which remain valid, though many current Linux distributions implement them through nftables compatibility layers.
