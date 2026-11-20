# Validation Summary: OpenSSH RSA Login: Fix `sign_and_send_pubkey: no mutual signature supported`

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and SSH client configuration.

## Technologies Covered
- OpenSSH client, server, configuration, and connection diagnostics.
- RSA public keys and SHA-1/SHA-2 signature algorithms.
- SSH host authentication, user authentication, agents, hardware tokens, and certificates.
- Ed25519 migration and shell/awk diagnostics.

## Sources Consulted
- [RFC 8332, sections 2–3](https://www.rfc-editor.org/rfc/rfc8332.html): RSA key encoding, SHA-2 signatures, and algorithm discovery.
- [OpenSSH 8.8 release notes](https://www.openssh.org/releasenotes.html#8.8): RSA SHA-1 default disablement and RSA SHA-2 support since 7.2.
- [OpenSSH 8.5 release notes](https://www.openssh.org/releasenotes.html#8.5): PubkeyAcceptedAlgorithms rename and compatibility alias.
- [OpenSSH legacy compatibility guide](https://www.openssh.org/legacy.html): negotiation failures and scoped compatibility settings.
- [ssh(1)](https://man.openbsd.org/ssh): -V, -G, -Q, -i, -o, -S none, and verbosity options.
- [ssh_config(5)](https://man.openbsd.org/ssh_config): Host matching, precedence, Match exec, identities, and signature allowlists.
- [ssh-keygen(1)](https://man.openbsd.org/ssh-keygen): public-key fingerprint inspection.
- [sshd(8)](https://man.openbsd.org/sshd): configuration validation and effective configuration using -t, -T, and -C.
- [sshd_config(5)](https://man.openbsd.org/sshd_config): server-side accepted signatures and RSA certificate algorithm names.
- [OpenSSH V_10_6_P2 source](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_6_P2/sshconnect2.c): signature selection, server-sig-algs handling, agent/token fallback, failure message, and debug level.
- Local OpenSSH_10.3p1 command execution for shell syntax, configuration parsing, supported algorithms, and fingerprint output.

## Issues Found
- Three GitHub source-code line anchors were inaccurate for the referenced V_10_6_P2 tag. Corrected the failure-message link from L1308 to L1405, algorithm-selection link from L1081 to L1166, and signature-debug link from L1318 to L1408. Verified the actual line numbers in the raw tagged source; browser-extracted text line numbers differ from file line numbers. No prose or command changes were necessary.

## Review Notes
- Confirmed the distinction between RSA key encoding and signature algorithms, the 7.2/8.5/8.8 version milestones, and the separation of host-key negotiation from account authentication.
- Confirmed that missing or incompatible server signature advertisements can prevent RSA SHA-2 selection and that the signature-choice message uses debug level three.
- All four Bash blocks passed bash -n. Parsed the supplied Host block with ssh -G using a temporary configuration and checked the temporary exception and SHA-2-only command-line allowlists. The exception preserved default algorithms and appended ssh-rsa; the replacement retained only the two specified SHA-2 algorithms.
- Successfully queried ssh -Q PubkeyAcceptedAlgorithms, including both RSA SHA-2 certificate names, and exercised ssh-keygen -lf against a disposable RSA public key. Temporary key material was removed automatically.
- The post correctly accounts for additional configured identities, Match exec execution, older option spelling, platform policy restrictions, certificates, and additional authentication factors.
- No live legacy server, appliance, agent, or hardware token was supplied. End-to-end login and vendor-specific policy behavior were reviewed against documentation and source rather than tested against a real destination. No user SSH configuration or running SSH service was changed.
