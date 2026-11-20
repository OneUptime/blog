# Validation Summary: Chain Local Port Forwards Through SSH Jump Hosts with `ProxyJump`

## Status
validated

## Post Type
Tutorial / practical configuration guide.

## Technologies Covered
- OpenSSH portable 10.3p1 and SSH client configuration.
- ProxyJump, local TCP forwarding, and direct-tcpip channels.
- SSH identities, host-key verification, and server forwarding restrictions.
- DNS resolution, TCP networking, HTTPS, and TLS identity verification.
- curl application health checks.

## Sources Consulted
- [OpenSSH ssh(1)](https://man.openbsd.org/ssh.1): command flags, jump lists, local forwarding, alternate configuration files, and configuration inspection.
- [OpenSSH ssh_config(5)](https://man.openbsd.org/ssh_config.5): endpoint configuration, identities, trust, connection sharing, foreground operation, and forwarding failure semantics.
- [OpenSSH sshd_config(5)](https://man.openbsd.org/sshd_config.5): account-scoped forwarding controls and PermitOpen matching.
- [OpenSSH sshd(8)](https://man.openbsd.org/sshd.8#AUTHORIZED_KEYS_FILE_FORMAT): authorized_keys forwarding restrictions.
- [OpenSSH 10.3p1 ssh.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh.c#L1322): construction of local proxy processes and propagation of -J and -F.
- [OpenSSH 10.3p1 serverloop.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/serverloop.c#L446): direct-tcpip authorization checks.
- [OpenSSH 10.3p1 channels.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/channels.c): destination matching, server-side resolution, and outgoing connections.
- [Version-pinned ssh_config(5) source](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh_config.5) and [sshd_config(5) source](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd_config.5): confirmation of configuration behavior in the stated version.
- [OpenSSH release notes](https://www.openssh.org/releasenotes.html): release existence and version currency.
- [Official curl manual](https://curl.se/docs/manpage.html): --connect-to, -q, --noproxy, timeout settings, TLS trust, output options, and HTTP error behavior.

## Issues Found
- The ProxyJump construction citation targeted ssh.c line 1231, outside the relevant construction code in the pinned release. Updated its anchor to line 1322, where the proxy command is constructed.
- The direct-tcpip authorization citation targeted serverloop.c line 391, outside the relevant authorization check. Updated its anchor to line 446, where forwarding direction, credential permission, and DisableForwarding are checked.
- No errors found in the commands, configuration, or substantive forwarding explanations. No prose or example changes were needed.

## Review Notes
- Extracted the exact SSH configuration into a temporary file and successfully ran ssh -G for all three aliases using the installed OpenSSH_10.3p1 client. Verified the expected users, addresses, ports, identity files, jump list, local forward, and trust/foreground settings.
- All four Bash command blocks passed bash -n syntax checks.
- Verified jump order, local authentication, final-relay destination resolution, and the three required forwarding destinations against official documentation and version-pinned source.
- Verified that server and credential restrictions both apply, PermitOpen compares the requested name, and listener setup success does not prove application readiness.
- Confirmed that curl's connection override preserves the URL hostname for TLS and HTTP, and that the post correctly requires checking the HTTP status and body.
- OpenSSH 10.3p1 is a real release dated April 2, 2026. The official release notes list newer releases, including 10.6p2 dated November 5, 2026. The article explicitly scopes its behavior to 10.3p1 and does not claim it is the latest release; that scope was retained. No documented option used here was found to be deprecated.
- Technical reference URLs resolve to the intended official manuals or upstream source files; the two inaccurate line anchors were corrected.
- No end-to-end tunnel, authentication, firewall, DNS, or HTTPS readiness test was performed against the illustrative infrastructure. Operational success requires the replacement hosts, credentials, host trust, permissions, and health endpoint described by the post.
