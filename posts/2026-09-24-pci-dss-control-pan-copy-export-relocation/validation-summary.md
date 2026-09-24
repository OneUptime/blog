# Validation Summary: How to Control PAN Copying, Export, and Relocation from the CDE

## Status
validated

## Post Type
Technical implementation guide. Although it contains no executable code, commands, or configuration snippets, it describes remote-access restrictions, authorization workflows, and operational verification, so it qualifies for technical review.

## Technologies Covered
- PCI DSS v4.0.1, primary account numbers (PAN), and the cardholder data environment (CDE)
- Remote Desktop Protocol (RDP), Azure Virtual Desktop, and virtual desktop infrastructure
- Microsoft Intune, Group Policy, and host-pool RDP properties
- Clipboard, drive, file-transfer, and printer redirection
- Application access control, data exports, audit logging, and incident response

## Sources Consulted
- [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/) — verified the post’s standard-library link.
- [PCI DSS v4.0.1, official download](https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf) — direct retrieval returned HTTP 403. Consulted [a text reproduction of the PCI SSC standard](https://studylib.net/doc/27825883/pci-dss-v4-0-1) for the requirements and applicability notes; this is a third-party host of the primary document.
- [PCI SSC-hosted presentation: Exploring PCI DSS v4.0 and ISO/IEC 27001:2022](https://www.pcisecuritystandards.org/wp-content/uploads/2024/12/WED_7_APCM_New-vs.-New_Exploring-PCI-DSS-and-27001_Liu_Shen_APCM_FINAL.pdf) — page 9 independently reproduces Requirements 3.4.2 and 12.10.7 for v4.0.1.
- [PCI SSC FAQ 1280: Card verification codes and recurring transactions](https://www.pcisecuritystandards.org/faqs/1280/) — checked the SAD retention statement.
- [PCI SSC FAQ 1139: Faxing payment card numbers](https://www.pcisecuritystandards.org/faqs/1139/) — checked that storage and transmission protections continue to apply to transferred card data.
- [Microsoft: Configure clipboard redirection](https://learn.microsoft.com/en-us/azure/virtual-desktop/redirection-configure-clipboard) — checked effective policy precedence, host-pool configuration, restart instructions, and transfer testing.
- [Microsoft: Configure clipboard transfer direction and data types](https://learn.microsoft.com/en-us/azure/virtual-desktop/clipboard-transfer-direction-data-types) — checked directional and format restrictions and platform prerequisites.
- [Microsoft: Peripheral and resource redirection over RDP](https://learn.microsoft.com/en-us/azure/virtual-desktop/redirection-remote-desktop-protocol) — checked redirection routes and client/platform differences.
- [Author’s GitHub profile](https://github.com/nawazdhandala) — verified the author link redirects to the intended profile.

## Issues Found
- **Direct database access exception was too broad:** The original wording allowed direct database access whenever a user’s responsibilities justified it. Requirement 7.2.6 reserves direct access or queries of stored cardholder-data repositories for responsible administrators. Revised the sentence to state that restriction and require other users to use applications or programmatic methods with enforced permissions.
- **Missing session-host restart in policy verification:** The original retesting instruction mentioned policy refresh and reconnection but omitted the host restart required by the cited Microsoft Intune and Group Policy instructions. Updated that paragraph to include any required session-host restart and explicitly identify Microsoft’s restart requirement. Refreshing policy and reconnecting alone does not follow the documented procedure.

## Review Notes
- Requirement 3.4.2 is correctly limited to remote-access technologies. Its technical-control requirement, authorization exception, and destination-device scope implications are accurately described.
- Masked support access, least privilege, controlled database access, and documented approvals are consistent with Requirements 3.4.1 and 7. Unexpected stored PAN correctly triggers Requirement 12.10.7 procedures.
- Export approval alone does not authorize SAD retention. Separate issuer/issuing-service applicability provisions do not arise merely from an export approval.
- The export-request checklist, suggested log fields, monitoring examples, and synthetic-data tests are implementation recommendations, not verbatim PCI DSS mandates or a complete compliance checklist.
- Microsoft documents that the most restrictive applicable clipboard setting wins. Direction/data-type controls have host prerequisites, while general redirection availability varies by client and platform. The post appropriately avoids claiming universal product support.
- No executable examples were present. No live Azure Virtual Desktop environment or payment application was available; validation consisted of documentation review, link checks, and inspection of the resulting files, not operational execution of the proposed tests.
- README changes were limited to the restart and direct database access corrections; the structure and remaining prose were preserved.
