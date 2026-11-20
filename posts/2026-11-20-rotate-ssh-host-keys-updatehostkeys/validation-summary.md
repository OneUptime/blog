# Validation Summary: How to Rotate SSH Host Keys Gracefully with `UpdateHostKeys`

## Status
validated

## Post Type
Technical guide with client/server configuration and command-line examples.

## Technologies Covered
- SSH and OpenSSH client/server host-key authentication
- `UpdateHostKeys` and the OpenSSH host-key update/proof extensions
- Ed25519 host keys and SHA256 fingerprints
- `ssh_config`, `sshd_config`, and user/global known-hosts trust stores
- Linux administration and Bash shell commands

## Sources Consulted
- [OpenSSH 6.8 release notes](https://www.openssh.org/txt/release-6.8): introduction of host-key rotation support.
- [OpenSSH 9.9p1 protocol documentation, section 2.5](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL): authenticated announcements, possession proofs, overlap, and retirement.
- [OpenBSD ssh_config(5)](https://man.openbsd.org/ssh_config): update prerequisites/defaults, configuration precedence, strict checking, connection sharing, trust files, algorithm selection, canonicalization, and Match rules.
- [OpenBSD ssh(1)](https://man.openbsd.org/ssh): configuration evaluation, verbosity, option overrides, and remote commands.
- [OpenBSD ssh-keygen(1)](https://man.openbsd.org/ssh-keygen): key generation, comments, passphrases, fingerprint options, and hashed-host lookup.
- [OpenBSD sshd_config(5)](https://man.openbsd.org/sshd_config): HostKey directives and private-key permissions.
- [OpenBSD sshd(8)](https://man.openbsd.org/sshd): configuration validation, effective configuration output, and reload behavior.
- [OpenSSH 10.3p1 sshconnect.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshconnect.c): disabling updates for certificate, global-file, and KnownHostsCommand authentication.
- [OpenSSH 10.3p1 sshd-auth.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd-auth.c): first matching public host-key selection.
- [OpenSSH 10.3p1 sshd-session.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd-session.c): announcement of configured plain host keys after successful user authentication.
- [OpenSSH 10.3p1 clientloop.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/clientloop.c): algorithm filtering, proof verification, update guards, file selection, and obsolete-key handling.
- [OpenSSH 10.3p1 hostfile.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/hostfile.c): temporary-file creation, backup linking, and replacement of known-hosts files.
- [OpenBSD mktemp(1)](https://man.openbsd.org/mktemp) and [cp(1)](https://man.openbsd.org/cp): backup filename templates, preservation options, and exit behavior.

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. Its technical links identify the relevant official manuals, release notes, protocol description, and version-pinned source files; the cited source tags were available for inspection.
- Confirmed that the overlap example can advertise two Ed25519 keys while selecting the first matching key for initial authentication. Learning follows successful user authentication and requires proof of possession for previously unknown keys.
- Confirmed the distinction between initial host trust and subsequent learning. The strict client configuration, independent fingerprint comparison, and replacement-only probe correctly test persisted trust. The compromise caveat and requirement to account for offline clients are appropriate.
- Confirmed that new keys are added only to the first user known-hosts file in 10.3p1, missing files are skipped, and updates require filesystem operations in the containing directory. Matching records in other configured user files can also be removed during an update. The post appropriately calls for checking actual files and update errors.
- Confirmed the algorithm and known-hosts guards, including complex patterns, markers, and keys associated with other names. These explain why successful login alone does not establish successful migration.
- All Bash examples passed `bash -n`. With local OpenSSH 10.3p1, an isolated configuration parsed with `ssh -G` and produced the expected hostname, port, strict-checking, and update settings. Temporary Ed25519 key generation and SHA256 fingerprint lookup succeeded for both plain and hashed known-hosts entries.
- No production SSH configuration or trust files were changed. No live server reload, MFA login, or end-to-end rotation was performed; server behavior was checked against official documentation and version-pinned implementation. Deployment-specific service names, configuration paths, crypto policy, security labels, and vendor changes remain subject to the checks already described in the post.
