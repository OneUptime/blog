# Validation Summary: How to Detect Unauthorized Wireless Access Points Within PCI DSS Scope

## Status
validated

## Post Type
Technical implementation guide for wireless detection and investigation. Although it contains no code, commands, or configuration snippets, its concrete network investigation and monitoring procedures warrant technical validation.

## Technologies Covered
- PCI DSS v4.0.1 and cardholder data environment (CDE) scope
- Wi-Fi access points, SSIDs, BSSIDs, and interface MAC addresses
- Wireless intrusion detection and prevention (WIDS/WIPS)
- Network access control (NAC), switch-port investigation, and physical inspection
- Security alerting, inventories, and incident response

## Sources Consulted
- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — verified the post's standards link and the listed PCI DSS v4.0.1 release.
- PCI SSC, PCI DSS v4.0.1, June 2024: Wireless scope discussion (printed page 14), Requirements 11.2.1–11.2.2 and guidance (pages 263–265), and incident-response Requirements 12.10.1 and 12.10.5. The [official PDF endpoint](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf) returned HTTP 403; the Council-authored standard was read through an [accessible mirrored copy](https://oneportal-os-images.s3hn.smartcloud.vn/Tai_lieu_PCI_DSS_v4_0_1_56d85a0665.pdf).
- [Cisco: Rogue Management in a Unified Wireless Network](https://www.cisco.com/c/en/us/td/docs/wireless/technology/roguedetection_deploy/Rogue_Detection.html) — radio versus wired MAC addresses, SSID impersonation, and classification evidence. Used for networking fundamentals, not current product commands.
- [Cisco: Identify and Locate a Rogue AP/Client on 9800 Wireless Controllers](https://www.cisco.com/c/en/us/support/docs/wireless/catalyst-9800-series-wireless-controllers/221688-identify-and-locate-a-rogue-ap-client-on.html) — BSSID, SSID, detection timestamps, location context, and separate wired-network status.
- [Cisco Meraki: Calculating BSSID MAC Addresses](https://documentation.meraki.com/Wireless/Design_and_Configure/Architecture_and_Best_Practices/Calculating_Cisco_Meraki_BSSID_MAC_Addresses) — multiple BSSIDs and their relationship to AP hardware addresses.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the intended author-link destination.

## Issues Found
No technical issues found.

## Review Notes
- Confirmed the three-month detection interval, conditional automated-alert requirement, and authorized inventory with business justification.
- Confirmed detection remains applicable when wireless is prohibited, including devices attached through otherwise authorized equipment.
- Confirmed that Requirement 11.2.2 guidance discusses nearby businesses, supporting evidence for disregarding observations, and incident response for threats to the CDE.
- The expanded inventory fields, separate external-observation records, and isolated detection exercise are practical recommendations, not additional prescribed PCI DSS fields or tests.
- SSIDs and MAC addresses support correlation but do not independently prove authorization or absence of connectivity. The post appropriately requires combined evidence.
- No executable examples required runtime testing. No live network survey or compliance assessment was performed; detection coverage must still be validated in the deployed environment.
- README.md was left unchanged. Both validation artifacts use the requested review date, 2026-09-24.
