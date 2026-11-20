# Validation Summary: Restrict SSH Certificate Logins: `AuthorizedPrincipalsFile` and Critical Options

## Status
validated

## Post Type
Technical tutorial / security configuration guide.

## Technologies Covered
- OpenSSH client and server configuration on Linux.
- SSH user certificates, certificate authorities, and principal authorization.
- Certificate critical options and permission extensions.
- Forced commands, source-address restrictions, and forwarding controls.
- Unix ownership and permissions, SELinux labels, and authentication testing.

## Sources Consulted
- [OpenSSH sshd_config manual](https://man.openbsd.org/sshd_config): principal authorization, CA trust, Match-compatible directives, authentication methods, and session restrictions.
- [OpenSSH sshd manual](https://man.openbsd.org/sshd): authorized-key options and configuration test modes.
- [OpenSSH ssh-keygen manual](https://man.openbsd.org/ssh-keygen): certificate signing flags, validity intervals, serials, critical options, and default permissions.
- [OpenSSH ssh_config manual](https://man.openbsd.org/ssh_config): identity selection, certificate algorithms, connection multiplexing, agent controls, and host trust.
- [OpenSSH ssh manual](https://man.openbsd.org/ssh): client command-line options.
- [OpenSSH 9.9p1 principal parser and address checks](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkeyfile.c).
- [OpenSSH 9.9p1 public-key authorization implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkey.c).
- [OpenSSH 9.9p1 authorization option parsing and merging](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth-options.c).
- [OpenSSH 9.9p1 certificate protocol](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL.certkeys).
- [OpenSSH 9.9p1 session command selection](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/session.c).
- [OpenSSH 10.3p1 tunnel forwarding checks](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/serverloop.c).

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post is technically relevant and includes executable commands and configuration examples.
- Confirmed that the server directives are permitted in Match blocks. The configured trust path requires a matching certificate principal and disables independent authorized-key and command-based alternatives for the deployment account.
- Verified exact, case-sensitive principal matching, selection of the first matching parsed line, and principals-file access under the target user's credentials. Both address restrictions must pass; permission flags merge restrictively, and conflicting forced commands cause authentication failure.
- Verified that server ForceCommand takes precedence at session execution. PermitTunnel no correctly supplies the separate tunnel-device restriction. Forced commands do not provide filesystem or process confinement.
- Generated disposable Ed25519 CA and client keys with local OpenSSH 10.3p1 and executed the signing example using temporary paths. Certificate inspection confirmed the requested key ID, serial 10072, principal, 35-minute total validity interval (five minutes before signing through thirty minutes after), force-command, source-address, and empty extensions list. Temporary credentials were removed automatically.
- Parsed the client example with ssh -G using the temporary key and certificate. Confirmed public-key-only preference, certificate-only Ed25519 algorithm selection, disabled agent access, configured identity files, strict host checking, and disabled PTY allocation. This was a configuration check, not a network login.
- Checked the cited manual pages and version-pinned implementation resources. The older source references support the claims made; the example uses options accepted by the locally installed 10.3p1 client.
- No live SSH service was reconfigured or reloaded, and the deployment program was not executed. Server-side authorization outcomes were reviewed against official documentation and source rather than tested against a provisioned Linux canary.
- Operational follow-up: choose sufficient server logging verbosity to capture the desired evidence; some certificate acceptance details are logged at VERBOSE and diagnostic details at DEBUG levels. When testing local forwarding, exercise the forwarded connection so a server channel request actually occurs. The supplied -T baseline intentionally does not request a PTY; use a separate PTY request for that negative test.
