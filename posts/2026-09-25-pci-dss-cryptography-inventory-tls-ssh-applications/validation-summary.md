# Validation Summary: How to Inventory TLS, SSH, and Application Cryptography for PCI DSS

## Status

validated

## Post Type

Technical guide with Bash command examples.

## Technologies Covered

- PCI DSS v4.0.1 cryptographic inventory and transition planning
- TLS, certificates, SNI, and OpenSSL 3.x
- OpenSSH server and client cryptographic configuration
- Application and storage encryption, password hashing, signing, and key management

## Sources Consulted

- PCI SSC document library: https://www.pcisecuritystandards.org/document_library/
- PCI SSC, PCI DSS v4.0.1, Requirement 12.3.3 and applicability notes, printed page 299. The library's PDF endpoint returned a retrieval error; the Council-authored standard was consulted through Middlebury's hosted copy: https://www.middlebury.edu/sites/default/files/2025-01/PCI-DSS-v4_0_1.pdf
- OpenSSL 3.5 s_client manual: https://docs.openssl.org/3.5/man1/openssl-s_client/
- OpenSSH sshd manual: https://man.openbsd.org/sshd.8
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config.5
- OpenSSH ssh manual: https://man.openbsd.org/ssh.1
- IETF RFC 9325, Recommendations for Secure Use of TLS and DTLS: https://www.rfc-editor.org/rfc/rfc9325.html

## Issues Found

No technical issues found.

## Review Notes

- Requirement 12.3.3 supports the stated inventory scope, review interval, ongoing monitoring, and response planning. Its applicability includes PAN protection, passwords, and authentication. The suggested record fields and rollout details are practical implementation guidance rather than a mandated PCI template.
- Verified the OpenSSL options for endpoint selection, SNI, hostname verification, verification failures, and brief output. The example observes one connection; it does not enumerate server policy or establish revocation checking. TLS version alone is insufficient to establish secure configuration.
- OpenSSL documents that EOF on redirected input can close connections prematurely, particularly with TLS 1.3. The post accurately describes a handshake and verification attempt. Investigations requiring a longer session may need explicit EOF and timeout handling.
- Verified sshd extended test mode and comma-separated connection parameters. The host parameter means the resolved source hostname; addr means the source address. Deployments using local-address or local-port Match conditions should supply those conditions too. Alternate configuration paths and daemon startup overrides must be reflected when reproducing deployed policy.
- Confirmed the distinction between ssh client capabilities, effective configuration read from disk, and the configuration loaded by a running daemon. Reviewed the documented cipher, key-exchange, MAC, host-key, and public-key authentication settings.
- Application runtime and configuration review is appropriate for identifying actual cryptographic uses; installed-library capabilities alone cannot prove use. Keeping secret material outside the inventory is consistent with recording controlled key references.
- Both Bash examples passed bash -n syntax checks. No live endpoint scan or privileged daemon inspection was performed; the examples require deployment-specific hostnames, trust settings, accounts, and configuration.
- The post's documentation links resolve to the intended resources. No deprecated options were identified in the examples. README.md was left unchanged.
