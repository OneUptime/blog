# Validation Summary: Rotate an OpenSSH Certificate Authority Without Locking Out Users

## Status
validated

## Post Type
Technical guide / operational runbook.

## Technologies Covered
- OpenSSH user and host certificates and certificate authorities.
- Ed25519 keys, certificate principals, validity intervals, and permission extensions.
- SSH client isolation, server authorization, MFA, and forwarding controls.
- Linux trust-bundle deployment, file permissions, and SELinux labeling.
- Known-hosts CA trust and DNS SSHFP verification.

## Sources Consulted
- [OpenSSH ssh-keygen(1)](https://man.openbsd.org/ssh-keygen): key generation, fingerprints, certificate signing, serials, validity, and certificate permissions.
- [OpenSSH ssh(1)](https://man.openbsd.org/ssh): configuration isolation, identity selection, routing, and diagnostics.
- [OpenSSH ssh_config(5)](https://man.openbsd.org/ssh_config): certificate selection, authentication algorithms, connection sharing, agent isolation, host trust, and DNS verification.
- [OpenSSH sshd_config(5)](https://man.openbsd.org/sshd_config): TrustedUserCAKeys, AuthorizedKeysCommand, principals policy, AuthenticationMethods, PermitTunnel, and HostCertificate.
- [OpenSSH sshd(8)](https://man.openbsd.org/sshd): configuration validation and reloads, authorized_keys CA entries, and known_hosts syntax.
- [OpenSSH 9.9p1 certificate protocol](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL.certkeys): certificate fields, validity semantics, and lack of certificate chaining.
- [OpenSSH 9.9p1 serverloop.c](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/serverloop.c): TCP and Unix-socket forwarding permission checks and separate tunnel-device policy.
- [OpenSSH 9.9p1 auth2-pubkey.c](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkey.c): CA-file lookup during authentication, principal and certificate checks, alternative authorization sources, and diagnostic messages.
- [OpenSSH 9.9p1 sshconnect.c](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/sshconnect.c): DNS verification of the underlying host key before known-hosts certificate validation.
- [Linux rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html): atomic replacement of an existing destination file.
- Locally installed OpenSSH 10.3p1 and Bash: executable checks of signing, bundle generation, client configuration, and shell syntax.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The trust-distribution, issuance-switch, and trust-retirement sequence is technically sound for a planned rotation. The separate treatment of a compromised CA is appropriate.
- Confirmed that user trust bundles accept multiple CA keys and are consulted during authentication. Replacing the bundle does not itself require a daemon reload; changes to daemon configuration and loaded host certificates do.
- Confirmed the probe isolates the selected user certificate, prevents raw-key fallback through its algorithm selection, disables connection reuse, and retains host verification. Its public-key-only scope is explicitly distinguished from production MFA workflows.
- Confirmed the limited certificate has only the permit-pty extension. TCP and Unix-socket forwarding use certificate forwarding permissions; tunnel-device forwarding has a separate server control.
- Confirmed that an unexpired old certificate is needed to distinguish trust removal from expiry in a negative test. The source provides a debug-level message for a signing CA absent from TrustedUserCAKeys.
- Confirmed the host probe excludes other known-hosts sources and DNS SSHFP acceptance, and requires evidence of the expected CA and completed certificate validation.
- Ran bash -n on all four Bash blocks. In a disposable temporary directory, generated two Ed25519 CAs and a user key, signed the example certificate, inspected its CA, ID, serial, principal, validity, and extensions, and ran the bundle-generation block. Both CA fingerprints appeared in the resulting bundle. Parsed the isolated client options with ssh -G successfully.
- Local execution used OpenSSH 10.3p1 on macOS. Linux privileged installation, SELinux enforcement, daemon reloads, actual remote authentication, MFA, and fleet rollout were reviewed from documentation and source rather than executed. No production SSH configuration was changed.
- The source links deliberately pin OpenSSH 9.9p1; they are implementation references, not a claim that 9.9p1 is the newest release. Current OpenBSD manuals and the local client support the options used. Fleet algorithm policies, service names, and effective account policies remain deployment-specific as the post states.
- Referenced OpenSSH documentation and source resources were checked for relevance; pinned source contents were retrieved through GitHub raw URLs. GNU Coreutils manual retrieval timed out, so those pages were not used as validation evidence.
