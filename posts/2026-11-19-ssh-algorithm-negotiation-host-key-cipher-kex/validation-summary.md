# Validation Summary: SSH Algorithm Negotiation: Fix Host Key, Cipher, and Key Exchange Errors

## Status
validated

## Post Type
Technical troubleshooting guide with terminal commands and OpenSSH configuration examples.

## Technologies Covered
- SSH transport negotiation and public-key authentication
- OpenSSH client and server configuration
- Host-key signatures, RSA/SHA-1, RSA/SHA-2, and DSA
- Key exchange, ciphers, MACs, and authenticated encryption
- SSH connection multiplexing and jump hosts
- RHEL system-wide cryptographic policies and FIPS restrictions
- Shell pipelines and awk

## Sources Consulted
- [OpenSSH legacy compatibility guide](https://www.openssh.org/legacy.html): algorithm families, compatibility options, and configuration inspection.
- [OpenSSH ssh manual](https://man.openbsd.org/ssh): `-V`, `-Q` and configuration-keyword query aliases, `-G`, `-vvv`, `-S none`, `-o`, and jump-host option scope.
- [OpenSSH ssh_config manual](https://man.openbsd.org/ssh_config): host aliases, first-value precedence, `Match exec`, algorithm settings, and append-versus-replace semantics.
- [OpenSSH negotiation implementation](https://raw.githubusercontent.com/openssh/openssh-portable/master/kex.c): local and peer proposal labels, failed peer choices, directional cipher/MAC negotiation, and implicit MAC handling for authenticated encryption.
- [OpenSSH 8.8 release notes](https://www.openssh.org/releasenotes.html#8.8): default disabling of RSA/SHA-1 signatures and continued use of RSA keys with SHA-2 signatures.
- [OpenSSH 10.0 release notes](https://www.openssh.org/releasenotes.html#10.0): DSA removal and finite-field Diffie-Hellman removal from server defaults without the corresponding client-default change.
- [OpenSSH sshd manual](https://man.openbsd.org/sshd): `-T`, `-t`, and `-C` connection parameters for applicable Match rules.
- [OpenSSH sshd_config manual](https://man.openbsd.org/sshd_config#HostKey): usable server host keys and algorithm restrictions.
- [OpenSSH ssh-keyscan manual](https://man.openbsd.org/ssh-keyscan): unauthenticated key collection and the risk of trusting unverified keys.
- [Red Hat Enterprise Linux 9: Using system-wide cryptographic policies](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening): policy inspection, SHA-1 restrictions, FIPS policy, and the broader effects of LEGACY policy.

## Issues Found
No technical issues found.

## Review Notes
- The post contains substantive technical implementation details and is suitable for validation. README.md required no changes.
- Confirmed that transport negotiation settings are distinct from account-authentication signature settings. The authenticated-encryption explanation correctly accounts for the absence of a separately selected MAC.
- Executed `ssh -V` and all four `ssh -Q` examples successfully with the local OpenSSH 10.3p1 client (LibreSSL 3.3.6).
- Parsed the exact SSH configuration snippet using a temporary configuration file and `ssh -G`; verified the hostname, user, and appended `ssh-rsa` algorithm. Executed the article's awk filter against that output successfully.
- Verified the command-line compatibility option and `-vvv -S none` syntax using `ssh -G` with an isolated configuration. These checks did not initiate a remote connection or alter the user's SSH configuration.
- Server test commands and RHEL policy commands were checked against official documentation; they were not executed against a managed server or RHEL installation. No live legacy endpoint was supplied, so successful remote negotiation and authentication were not tested.
- The historical 8.8 and 10.0 claims are accurate. The article appropriately distinguishes disabled algorithms from removed implementations and cautions that downstream platform policy can further restrict use.
- Referenced technical documentation URLs resolved to the relevant official resources. Upstream manuals and the master-branch source are moving references, so installed versions and local policy remain relevant when applying the examples.
