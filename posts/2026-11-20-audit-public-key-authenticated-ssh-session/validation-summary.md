# Validation Summary: How to Audit Which Public Key Authenticated Each SSH Session

## Status
validated

## Post Type
Technical guide for auditing OpenSSH authentication and session activity.

## Technologies Covered
- Portable OpenSSH 10.3p1 and SSH public-key authentication
- SSH certificates, certificate authorities, and SHA-256 fingerprints
- Linux authentication logging and systemd journal metadata
- Multiple-method authentication and PAM
- SSH connection multiplexing, shells, and SFTP sessions
- Bash-compatible shell commands

## Sources Consulted
- [OpenSSH 10.3p1 version definitions](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/version.h): confirmed the version associated with the cited source tag.
- [OpenSSH authentication logger](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/auth.c): authentication log levels, message formatting, and certificate fields.
- [Public-key authentication implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/auth2-pubkey.c): unsigned key queries, signature verification, and certificate authorization messages.
- [Authorized-key checks](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/auth2-pubkeyfile.c): authorization messages preceding completed authentication.
- [Authentication monitor](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/monitor.c): partial authentication and required-method handling.
- [Session implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/session.c): session-start records, reusable session numbers, and authentication-information file ownership and cleanup.
- [Key serialization and fingerprinting](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshkey.c): fingerprints use the underlying public key rather than the complete certificate.
- [sshd_config manual](https://man.openbsd.org/sshd_config) and [10.3p1 manual source](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd_config.5): logging, fingerprint hashing, authorization sources, authentication method lists, and ExposeAuthInfo.
- [sshd manual](https://man.openbsd.org/sshd): configuration-file selection, validation mode, and reload behavior.
- [ssh-keygen manual](https://man.openbsd.org/ssh-keygen): fingerprint display, hash selection, and certificate inspection.
- [ssh manual](https://man.openbsd.org/ssh#S) and [ssh_config manual](https://man.openbsd.org/ssh_config#ControlMaster): disabling connection sharing and multiplexing behavior; also checked the corresponding 10.3p1 manual sources.
- [journalctl manual](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html): time filtering, pager suppression, precise ISO output, and structured export.
- [Journal field reference](https://www.freedesktop.org/software/systemd/man/latest/systemd.journal-fields.html): machine, boot, and process metadata.
- [systemd time syntax](https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html): explicit UTC timestamps.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post contains technical commands and implementation details and qualifies for technical validation.
- Confirmed that successful authentication is logged at INFO, while ordinary partial-authentication and session-start evidence requires VERBOSE. The synthetic raw-key, PAM, and session messages match the source formatting.
- Confirmed that authorization messages alone do not establish signature verification or completion of every required authentication method. Repeated publickey requirements require distinct keys.
- Confirmed certificate log fields and the distinction between a public-key fingerprint and an individual certificate issuance. The recommendation to govern serial uniqueness and retain issuance history is appropriate.
- Confirmed that session numbers can be reused, ordinary command text is omitted from session-start messages, and the start message precedes program execution. Multiplexed sessions share the connection's authentication context.
- Confirmed that ExposeAuthInfo creates its temporary file under the authenticated user's identity and removes it during connection cleanup. It is appropriately described as mutable diagnostic evidence rather than protected audit storage.
- Checked all five Bash command blocks with bash -n; all passed. CLI options and configuration values were checked against official documentation. No example paths, credentials, or timestamps were treated as actual deployment values.
- This review used documentation and version-pinned source inspection; it did not run a Linux SSH server, exercise PAM, reload a service, or collect real authentication logs. The recommended raw-key, certificate, partial-failure, and multiplexing checks remain deployment verification steps.
- The PAM sequence assumes PAM support and enabled authentication methods. Service names, log destinations, distribution patches, and effective conditional configuration remain environment-specific as the post explains. The short-iso-precise journal format requires systemd 234 or later.
- The linked technical resources resolve to the relevant official manuals or upstream source files. Moving manual pages may describe newer releases; version-sensitive logging behavior was checked against V_10_3_P1. No deprecated options were identified in the examples.
