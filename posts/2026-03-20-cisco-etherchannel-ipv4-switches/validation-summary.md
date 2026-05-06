# Validation Summary: How to Configure EtherChannel with IPv4 on Cisco Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS switching
- EtherChannel / Port-channel
- LACP
- PAgP
- IPv4 routed uplinks
- 802.1Q trunking

## Sources Consulted
- Cisco Catalyst 3850 Layer 2/3 Configuration Guide, "Configuring EtherChannels": https://www.cisco.com/en/US/docs/switches/lan/catalyst3850/software/release/3se/consolidated_guide/b_consolidated_3850_3se_cg_chapter_01001100.html
- Cisco Catalyst 9600 Configuration Guide, "Configuring EtherChannels": https://www.cisco.com/c/dam/en/us/td/docs/switches/lan/catalyst9600/software/release/16-12/configuration_guide/lyr2/configuring_etherchannels.html
- Cisco C9000 Series EtherChannel Configuration Guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/etherchannel/etherchannel-configuration-guide/m_ethernetchannel.pdf
- Cisco Catalyst 2960 Series Configuration Guide, "Configuring EtherChannels": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/15-2_3_e/consolidated_guide/b_1523e_2960p_2960c_cg/b_1522e_2960_2960c_2960s_2960sf_2960p_cg_chapter_0100101.html
- Cisco Catalyst 3850 Interface and Hardware Component Command Reference: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3850/software/release/3e/int_hw_components/command_reference/b_int_3e_3850_cr.pdf

## Issues Found
- The introduction stated EtherChannel bundles "2–8 physical links" generically. I changed this to "multiple physical links" because platform support varies, and Cisco documentation is platform-specific about member limits.
- The Layer 3 EtherChannel example omitted `no ip address` on the member interfaces. I added it to match Cisco’s documented Layer 3 EtherChannel procedure and to keep IP addressing on the logical port-channel.
- The PAgP comment described `desirable` as "active," which can be confused with LACP `active`. I changed the wording to "actively negotiates" to match Cisco’s PAgP mode description more precisely.
- The load-balancing section described `src-dst-ip` and `src-dst-mac` as "best" choices and presented the option list as if it were exhaustive. I changed this to "common choice" wording and noted that supported options vary by platform and IOS release.
- The `show etherchannel summary` legend was incorrect. I corrected `SU` to mean Layer 2 and in use, and `P` to mean bundled in the port-channel.
- The conclusion implied bandwidth gains too broadly. I changed it to "aggregate bandwidth" to avoid implying that a single flow’s throughput is multiplied across member links.

## Review Notes
- The post is technically sound after the corrections above.
- EtherChannel limits and load-balancing keywords vary by platform and release. On many Cisco IOS switches, up to eight links are active in a bundle, while some platforms also support additional LACP standby members.
