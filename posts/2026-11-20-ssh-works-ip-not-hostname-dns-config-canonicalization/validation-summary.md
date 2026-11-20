# Validation Summary: SSH Works by IP but Not by Hostname: Inspect DNS, Host Blocks, Canonicalization, and Host-Key Entries

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- OpenSSH client configuration, multiplexing, authentication, and host-key verification.
- DNS, IPv4/IPv6, glibc Name Service Switch, and Linux name resolution.
- BIND dig and systemd-resolved/resolvectl.
- Bash and awk diagnostic commands.

## Sources Consulted
- [OpenSSH ssh manual](https://man.openbsd.org/ssh): configuration inspection, debug output, address families, jump hosts, and disabling connection sharing.
- [OpenSSH ssh_config manual](https://man.openbsd.org/ssh_config): precedence, Host and Match conditions, identities, canonicalization, and trust configuration.
- [OpenSSH ssh-keygen manual](https://man.openbsd.org/ssh-keygen): known_hosts searches, nondefault ports, and hashed entries.
- [OpenSSH 10.3 release notes](https://www.openssh.org/txt/release-10.3): release and version context.
- [OpenSSH 10.3p1 readconf.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/readconf.c): configuration parsing and matching.
- [OpenSSH 10.3p1 ssh.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/ssh.c): canonicalization, final configuration passes, inspection exit, jump command construction, and alias normalization.
- [OpenSSH 10.3p1 sshconnect.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/sshconnect.c): host-key lookup names, port handling, and address checks.
- [OpenSSH 10.3p1 channels.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/channels.c): forwarded destination resolution and address-family selection.
- [Debian/Linux getent manual](https://manpages.debian.org/bookworm/manpages/getent.1.en.html): NSS and ahosts/getaddrinfo behavior.
- [ISC BIND dig documentation](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility): query syntax, .digrc suppression, record types, timeouts, and retries.
- [systemd resolvectl manual](https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html): query/status commands, search domains, and interface information.

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. The post is technically relevant and includes actionable commands and valid configuration examples.
- All Bash code blocks passed bash -n syntax checks. An isolated temporary configuration tested with ssh -G selected deploy and app.example.net for both alias spellings, and fallback for the numeric address, as described. No SSH server connection was made.
- Checked the awk field filters against the effective-configuration output and reviewed the command flags against the official manuals.
- Confirmed that -G can process canonicalization and Match exec before exiting, while -S none disables connection sharing. The first-value precedence and additive IdentityFile explanation are accurate.
- Verified the version-specific canonicalization and trust-name details against the V_10_3_P1 source. Explicit HostKeyAlias values are lowercased and used without an automatically appended port. The post appropriately distinguishes ordinary DNS CNAME resolution from SSH target rewriting.
- Confirmed that forwarded destination resolution uses the jump server's resolver and address-family context; client -4 does not force the final forwarded hop to IPv4.
- Resolver commands are explicitly scoped to Linux/glibc and systemd where applicable. Their live behavior was reviewed from documentation rather than reproduced on a configured Linux DNS/VPN environment.
- Opened the cited external technical resources successfully. The internal host-key repair link was checked against the corresponding repository post.
- OpenSSH 10.3 was released on 2026-04-02, and the cited portable release tag exists. This review validates the stated version rather than asserting it is the latest release. Local configuration checks supplement, rather than replace, the pinned-source review.
- No end-to-end authentication, live DNS failure, or host-key replacement was performed; the addresses and names are illustrative placeholders.
