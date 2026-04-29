# Validation Summary: How to Understand IPv6 Privacy in Enterprise Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and interface identifiers
- SLAAC and Neighbor Discovery
- RFC 7217 stable opaque IIDs
- RFC 8981 temporary IPv6 addresses
- Linux IPv6 sysctls (`addr_gen_mode`, `use_tempaddr`, `stable_secret`)
- `radvd` router advertisement configuration
- Enterprise IPAM, DNS, and flow logging
- GDPR, CCPA, HIPAA, and PCI DSS compliance considerations

## Sources Consulted
- RFC 7217, "A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC)": https://datatracker.ietf.org/doc/html/rfc7217
- RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6": https://datatracker.ietf.org/doc/html/rfc8981
- RFC 4862, "IPv6 Stateless Address Autoconfiguration": https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4291, "IP Version 6 Addressing Architecture": https://datatracker.ietf.org/doc/html/rfc4291
- RFC 8064, "Recommendation on Stable IPv6 Interface Identifiers": https://datatracker.ietf.org/doc/html/rfc8064
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `radvd.conf(5)` man page: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- California Civil Code §1798.140 (CCPA definitions): https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140
- GDPR text on EUR-Lex (Regulation (EU) 2016/679): https://eur-lex.europa.eu/legal-content/EN/AUTO/?qid=1772560551609&uri=CELEX%3A32016R0679
- HHS HIPAA Audit Protocol: https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/audit/protocol-edited/index.html
- PCI SSC FAQ on user identification and audit trails: https://www.pcisecuritystandards.org/faqs/does-pci-dss-requirement-8-2-2-allow-users-to-share-authentication-credentials/
- PCI SSC FAQ on applicability of specific authentication requirements: https://www.pcisecuritystandards.org/faqs/do-pci-dss-requirements-8-3-9-and-8-3-10-1-apply-to-all-system-components/
- Local CLI help output checked for command syntax: `sysctl --help`, `ip link help`, `ip -6 neigh help`

## Issues Found
1. **Workstation privacy guidance conflicted with the policy table**: The post said employee workstations should use stable addresses and "not rotating temp addresses", but the table later recommended `use_tempaddr=2`. I updated the workstation section to keep an RFC 7217 stable address for management while preferring temporary addresses for outbound client traffic, and added the missing `use_tempaddr=2` sysctl lines.

2. **Linux RFC 7217 guidance missed a required prerequisite**: On Linux, `addr_gen_mode=2` uses RFC 7217 IIDs and depends on a host `stable_secret`. I added a note explaining that the secret should be provisioned during installation/imaging so the example is technically accurate.

3. **Server comment overstated what `addr_gen_mode=2` means**: The original comment implied `addr_gen_mode=2` was generically fine for "static-privacy". I changed it to the accurate statement that `addr_gen_mode=2` only matters if the server is still using SLAAC and wants to avoid MAC-derived IIDs.

4. **The `radvd` example used an invalid IPv6 prefix**: `2001:db8:guest::/64` is not valid IPv6 syntax because `guest` is not hexadecimal. I replaced it with the valid documentation prefix `2001:db8:100::/64` and tightened the comments so they describe prefix/address deprecation behavior accurately.

5. **Compliance language overstated HIPAA and PCI DSS requirements**: The post said stable addressing was required for HIPAA and PCI DSS systems. That is not what the cited standards require. I revised the table to focus on audit controls, access controls, logging, inventory, and segmentation, which are the actual relevant controls.

6. **GDPR explanation was too absolute**: The post stated that EUI-64 addresses "constitute personal data" and described RFC 7217 addresses as pseudonymous in a way that was too categorical. I rewrote this to the more accurate claim that IPv6 addresses can be personal data when linkable to an identifiable person, and that modified EUI-64 IIDs are more directly linkable than RFC 7217 opaque, prefix-specific IIDs.

7. **Conclusion overstated what RFC 7217 alone provides**: The original ending implied RFC 7217 stable addresses themselves provide broad external privacy. I corrected this to distinguish between RFC 7217 reducing MAC-derived and cross-network linkability, and temporary addresses reducing tracking of outbound client traffic.

## Review Notes
- The post is now technically sound for the Linux examples it shows, but the sysctl guidance is Linux-specific and should not be generalized to Windows or macOS without platform-specific validation.
- The Linux kernel documentation for `use_tempaddr` still references RFC 3041 in the sysctl description, but the relevant temporary-address behavior and default lifetimes align with current RFC 8981 guidance.
