# Validation Summary: How to Configure IP Source Guard on Cisco Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- Cisco Catalyst switching
- IP Source Guard (IPSG)
- DHCP Snooping
- Port Security
- IPv4 Layer 2 security

## Sources Consulted
- Cisco, "Software Configuration Guide, Cisco IOS Release 15.2(2)E - Configuring IP Source Guard": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/15-2_2_e/configuration/guide/b_1522e_2960_2960c_2960s_2960sf_2960p_cg/b_1522e_2960_2960c_2960s_2960sf_2960p_cg_chapter_010101.html
- Cisco, "Catalyst 2960 and 2960-S Switch Command Reference, 12.2(53)SE1 - ip verify source / ip source binding": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/12-2_53_se/command/reference/2960ComRef/cli1.html
- Cisco, "Catalyst 2960 and 2960-S Switch Command Reference, 12.2(53)SE1 - show ip verify source / show ip source binding": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/12-2_53_se/command/reference/2960ComRef/cli2.pdf
- Cisco, "Software Configuration Guide, Cisco IOS Release 15.2(2)E - Configuring Port-Based Traffic Control": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/15-2_2_e/configuration/guide/b_1522e_2960_2960c_2960s_2960sf_2960p_cg/m_1522e_sec_port_based_traffic_ctrl_2960_cg.html
- Cisco, "Catalyst 2960, 2960-S, and 2960-P Switch Command Reference, Cisco IOS Release 15.0(2)EZ - ip dhcp snooping information option": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/15-0_2_ez/command/reference/cr2960/cli1.html

## Issues Found
- The description and introduction treated IPSG as if it always enforced both IP and MAC matching from the DHCP snooping table. I corrected this to reflect Cisco's documented behavior: `ip verify source` filters by source IP, while `ip verify source port-security` adds source MAC filtering, and bindings can come from DHCP snooping or manual `ip source binding` entries.
- The prerequisites and MAC-filtering example omitted Cisco's documented requirements for `ip verify source port-security`. I added `ip dhcp snooping information option`, noted the Option 82 requirement, and enabled `switchport port-security` on the relevant interfaces.
- The static binding examples used non-Cisco MAC formatting. I changed the MAC addresses to Cisco-style dotted notation used in the official command examples.
- The verification example showed incomplete MAC addresses and implied `show ip verify source` was a binding table display. I corrected the sample output and added `show ip source binding` so the post verifies both static and DHCP-derived bindings accurately.
- The conclusion overstated the guarantee by saying IPSG makes spoofing "impossible" and referred only to the DHCP snooping table. I corrected that language to match Cisco's documented scope and enforcement model.

## Review Notes
- The post is technically sound after correction for classic Cisco IOS/Catalyst IPSG behavior on Layer 2 ports.
- Cisco documents additional caveats for `ip verify source port-security`, especially around Option 82 support and platform-specific behavior. Readers should verify support on their exact switch model and IOS release.
- Newer Cisco platforms may also support IPSG for static hosts through IP device tracking, but that is outside the scope of this post.
