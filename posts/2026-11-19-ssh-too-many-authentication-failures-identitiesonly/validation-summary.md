# Validation Summary: SSH Too Many Authentication Failures: Select Keys with `IdentitiesOnly`

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- SSH and OpenSSH client/server authentication
- SSH agents, identity files, public keys, and certificates
- OpenSSH client configuration and host matching
- PKCS#11 and security-key providers
- Bash commands and AWK output filtering

## Sources Consulted
- [OpenSSH ssh(1)](https://man.openbsd.org/ssh): `-i`, `-o`, `-G`, `-F`, `-S`, and verbose diagnostics.
- [OpenSSH ssh_config(5)](https://man.openbsd.org/ssh_config): configuration precedence, `Host` negation, `Match exec`, `Include`, `IdentitiesOnly`, `IdentityFile`, `CertificateFile`, and `IdentityAgent`.
- [OpenSSH sshd_config(5)](https://man.openbsd.org/sshd_config): `MaxAuthTries`, `AuthenticationMethods`, `MaxStartups`, and `PerSourcePenalties`.
- [OpenSSH ssh-add(1)](https://man.openbsd.org/ssh-add): fingerprint listing and agent socket selection.
- [OpenSSH ssh-keygen(1)](https://man.openbsd.org/ssh-keygen): `-l` and `-f` fingerprint command options.
- [OpenSSH 10.3p1 client authentication source](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshconnect2.c#L1564): candidate ordering, agent matching and filtering, and public-key versus private-key authentication paths.
- [OpenSSH 10.3p1 configuration parser](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/readconf.c#L57): configuration ordering and additive identity-file parsing at line 1332.
- [OpenSSH 10.6p2 server authentication source](https://github.com/openssh/openssh-portable/blob/V_10_6_P2/auth2.c): failure accounting, partial authentication, and authentication completion.
- [OpenSSH release notes](https://www.openssh.org/releasenotes.html#9.8): introduction of `PerSourcePenalties` in OpenSSH 9.8.

## Issues Found
No technical issues found.

The README.md was left unchanged.

## Review Notes
- Verified the commands and configuration directives against official manuals. All Bash code blocks passed `bash -n` syntax checks.
- Used the installed OpenSSH 10.3p1 client with temporary configuration files and `ssh -G` to verify additive identities, wildcard exclusion, the fact that `IdentityFile none` does not clear previous entries, first-value scalar precedence, and command-line override behavior. Also checked parsing with `/dev/null`, `IdentitiesOnly=yes`, and `-S none`.
- The two AWK expressions correctly select the intended configuration fields. The sample hostnames, account, and key paths require substitution as the article states.
- Confirmed that configured identities may use an agent for signing while unrelated agent keys are filtered. The pinned 10.3p1 source links resolve and support the implementation claims; they are versioned references, not a claim that 10.3p1 is the latest release.
- Confirmed the distinctions between candidate enumeration, public-key offers, preliminary key acceptance, and completed authentication. Local passphrase unlocking is separate from server authentication attempts.
- Certificate auto-discovery applies when certificates have not been explicitly configured. The article correctly presents automatic discovery and explicit certificate configuration as alternatives.
- The authentication-attempt limit and connection throttling describe separate failure stages. The documented default of six authentication attempts and the OpenSSH 9.8 introduction of source penalties are correct.
- Validation used documentation, source inspection, and local configuration checks. No connection to the example destination was attempted, no existing agent identities were changed, and successful authentication against a live server was not tested.
