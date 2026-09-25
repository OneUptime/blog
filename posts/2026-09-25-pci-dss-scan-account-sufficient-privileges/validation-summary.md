# Validation Summary: How to Choose Scan-Account Privileges for PCI DSS Authenticated Scans

## Status

validated

## Post Type

Technical guide. The post contains implementation guidance for scan-account permissions, supported elevation, inspection coverage, and credential protection. It warrants technical review even though it contains no executable code or commands.

## Technologies Covered

- PCI DSS v4.0.1 authenticated internal vulnerability scanning
- Tenable Nessus credentialed checks
- Linux SSH accounts, root privileges, and controlled elevation
- Windows local administrative access and authenticated inspection prerequisites
- Scan credential management and coverage verification

## Sources Consulted

- [PCI SSC Document Library](https://www.pcisecuritystandards.org/document_library/) — confirmed that the linked library provides PCI DSS v4.0.1.
- [PCI DSS v4.0.1, Requirements and Testing Procedures, June 2024](https://www.middlebury.edu/sites/default/files/2025-01/PCI-DSS-v4_0_1.pdf) — PCI SSC-authored standard hosted by Middlebury; checked Requirements 8.2.2 and 11.3.1.2, printed pages 179–180 and 269, and the applicability note for 11.3.1.3 on page 270. The Council's linked PDF endpoint returned HTTP 403, so this copy supplied the standard's text.
- [Tenable Nessus Credentialed Checks](https://docs.tenable.com/nessus/Content/NessusCredentialedChecks.htm) — checked access levels and the distinction between authentication and successful credentialed checks.
- [Credentialed Checks on Linux](https://docs.tenable.com/nessus/Content/CredentialedChecksOnLinux.htm) — checked root requirements, SSH authentication, dedicated accounts, and elevation support.
- [Credentialed Checks on Windows](https://docs.tenable.com/nessus/Content/CredentialedChecksOnWindows.htm) — checked administrative access, registry and file inspection, and host access prerequisites.
- [Configure a Least-Privilege SSH Scan](https://docs.tenable.com/nessus/Content/configure-least-privilege-ssh-scan.htm) — checked the supported iterative approach to identifying required permissions.
- [Credentialed Scanning and Privileged Account Use](https://docs.tenable.com/nessus/compliance-checks-reference/Content/CredentialedScanningandPrivilegedAccountUse.htm) — checked privilege protection, missing-result review, and the possibility of permission requirements changing with plugins or audits.
- [Configuring Least Privilege SSH Scans with Nessus](https://www.tenable.com/blog/configuring-least-privilege-ssh-scans-with-nessus) — corroborated the warning that static command lists can become stale as plugins change; current documentation was preferred for current behavior.

## Issues Found

No technical issues found.

## Review Notes

- Requirement 11.3.1.2 supports the post's statements about sufficient privileges, host-based or network-based tools, documenting systems unable to accept credentials, and applying 8.2.2 to scan accounts capable of interactive login. It applies to internal scans and became mandatory after 31 March 2025.
- The discussion of approval and individual attribution accurately summarizes part of 8.2.2 and refers readers to its full controls; it is not a complete compliance checklist.
- Tenable supports the stated Linux and Windows access requirements. Local administrative access does not imply a universal requirement for domain administrator credentials. Tenable separately documents domain controller requirements, which should be considered when building the proposed platform matrix.
- Tenable's credentialed-check indicator requires more than successful authentication. Inventory evidence and individual check failures remain relevant when evaluating actual coverage.
- The matrix, known-state pilot, finding-count caution, and repeated coverage checks are practical operating recommendations. The post appropriately avoids presenting its acceptance examples as additional PCI requirements. Repeating a pilot after changes should not be confused with a claim that PCI DSS 11.3.1.3 always requires authenticated scans after significant changes.
- The fenced text is an illustrative review record, not a scanner configuration or executable program. No code, CLI, or configuration syntax tests were applicable, and no live scans were performed.
- The cited documentation URLs resolve to relevant resources. Nessus documentation inspected during review identifies itself as the 10.12.x guide; the post does not promise identical behavior across all scanner versions or products.
- README.md required no changes. Validation date: 2026-09-25.
