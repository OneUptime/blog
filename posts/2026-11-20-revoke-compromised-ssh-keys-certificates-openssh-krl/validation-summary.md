# Validation Summary: How to Revoke Compromised SSH Keys and Certificates with an OpenSSH KRL

## Status

validated

## Post Type

Tutorial / operational security guide.

## Technologies Covered

- OpenSSH SSH client, sshd server, and ssh-keygen.
- OpenSSH Key Revocation Lists (KRLs).
- SSH public keys, user and host certificates, certificate authorities, serial numbers, and key IDs.
- Linux file deployment, permissions, atomic replacement, and SELinux considerations.
- Shell commands and SSH client/server configuration.

## Sources Consulted

- [OpenSSH ssh-keygen manual](https://man.openbsd.org/ssh-keygen), including fingerprint and certificate inspection, KRL creation and updates, specification directives, and query behavior.
- [OpenSSH sshd_config: RevokedKeys](https://man.openbsd.org/sshd_config#RevokedKeys), including unreadable-file behavior and atomic replacement requirements.
- [OpenSSH ssh_config manual](https://man.openbsd.org/ssh_config), including RevokedHostKeys, ControlPath, IdentityAgent, IdentitiesOnly, CertificateFile, PubkeyAcceptedAlgorithms, HostKeyAlgorithms, and StrictHostKeyChecking.
- [OpenSSH ssh manual](https://man.openbsd.org/ssh), including configuration isolation with -F and configuration inspection with -G.
- [OpenSSH sshd manual](https://man.openbsd.org/sshd), for daemon configuration validation.
- [OpenSSH 9.9p1 KRL implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/krl.c), for certificate-to-revocation selection, underlying-key checks, CA checks, and file loading.
- [OpenSSH 9.9p1 KRL protocol specification](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL.krl), for revocation record formats and rejection of embedded signatures starting with OpenSSH 9.4.
- [OpenSSH 9.9p1 ssh-keygen implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/ssh-keygen.c), for query output and exit status.
- [OpenSSH 9.9p1 authentication implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth.c), for revocation file checks and rejection diagnostics.
- [OpenSSH 9.9p1 public-key authentication implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkey.c), for authentication and certificate handling.
- Local OpenSSH 10.3p1 executable behavior, exercised with disposable Ed25519 keys and certificates.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post is technically relevant and its commands and configuration options remain applicable.
- Disposable-key checks confirmed that revoking a plain public key rejects both the raw key and certificates containing it under different CAs. An unrelated replacement key remained unrevoked.
- Creating a KRL from a nonzero-serial certificate revoked that certificate while leaving its raw key and a certificate with the same serial from another CA unrevoked.
- Copying an existing KRL and updating it with -u preserved the previously revoked key while adding the new revocation.
- Specification-based updates correctly revoked serial 4102 and the inclusive range 4200–4210. Boundary checks confirmed rejection at 4200 and 4210 and no rejection at 4199 and 4211.
- A serial-zero certificate input produced key-ID revocation. Another certificate under the same CA with the same ID was also revoked, while the raw key remained unrevoked. A serial: 0 specification was rejected.
- Adding the CA public key as an input revoked another certificate from that CA while leaving a certificate from a different CA unrevoked.
- Fingerprint inspection, certificate inspection, KRL listing without credential arguments, query output, and the expected 0/1 query exit statuses were exercised successfully.
- The canary client's options parsed successfully with ssh -G; its effective accepted user-authentication algorithm was restricted to the specified Ed25519 certificate algorithm. Documentation confirms that -F /dev/null ignores normal client configuration files and IdentityAgent=none disables agent use.
- The version-pinned source links are appropriate evidence for the stated behavior; current manual pages and the installed OpenSSH 10.3p1 corroborate the relevant commands. The OpenSSH 9.4 embedded-signature limitation is explicitly documented in PROTOCOL.krl.
- The post correctly separates KRL query results from proof of authentication enforcement, and distinguishes server-side user revocation from client-side host revocation. Its guidance on deployment freshness, canary tests, recovery access, and existing sessions is consistent with that distinction.
- No live SSH server deployment, privileged installation, SELinux relabeling, service reload, or end-to-end user/host authentication probe was performed. Those operational steps were reviewed against documentation and source; environment-specific verification remains necessary as the post describes.
- GNU Coreutils web manual retrieval for install and mv timed out. The illustrated owner, group, mode, and same-directory replacement syntax was reviewed, but was not executed against system paths.
