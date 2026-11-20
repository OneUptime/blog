# Validation Summary: SSH Host Identification Has Changed: Verify Before Editing `known_hosts`

## Status
validated

## Post Type
Technical troubleshooting and security guide.

## Technologies Covered
- SSH and OpenSSH client/server host authentication.
- Host public keys, SHA256 fingerprints, host certificates, and revocation records.
- `known_hosts`, hashed hostnames, aliases, and nondefault ports.
- `ssh`, `ssh-keygen`, `ssh-keyscan`, and SSH configuration.
- Bash, AWK, and file backup utilities.

## Sources Consulted
- OpenSSH `ssh(1)`: configuration inspection, verbose diagnostics, host verification, and connection sharing — https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)`: host aliases, canonicalization, trust files, managed records, strict checking, connection reuse, and key rotation — https://man.openbsd.org/ssh_config
- OpenSSH `ssh-keygen(1)`: fingerprinting, key lookup, hashing, and removal — https://man.openbsd.org/ssh-keygen
- OpenSSH `ssh-keyscan(1)`: collection and independent verification of host keys — https://man.openbsd.org/ssh-keyscan
- OpenSSH `sshd(8)`: authentication and known-hosts record format — https://man.openbsd.org/sshd
- OpenSSH `sshd_config(5)`: configured server host keys — https://man.openbsd.org/sshd_config#HostKey
- OpenSSH portable 10.3p1 `ssh.c`: lowercasing host-key aliases — https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh.c#L1352-L1354
- OpenSSH portable 10.3p1 `sshconnect.c`: hostname/port lookup construction and portless fallback for a new host — https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshconnect.c
- OpenSSH portable 10.3p1 `ssh-keygen.c`: whole-record removal, preservation of policy markers, and backup behavior — https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh-keygen.c

## Issues Found
- The alias-normalization source link selected lines 1290–1292 of `ssh.c`, which concern ProxyJump setup rather than alias normalization in the referenced 10.3p1 release. Updated the fragment to lines 1352–1354, which contain the `HostKeyAlias` lowercase conversion. The associated explanation was correct.
- No technical errors were found in the commands or remaining explanations.

## Review Notes
- Checked every Bash example with `bash -n` and exercised the replacement sequence using temporary Ed25519 keys and temporary trust files with OpenSSH 10.3p1 (LibreSSL 3.3.6).
- The valid replacement preserved an unrelated host entry, installed the normalized replacement key, and retained an exact backup. Empty, multiple-line, malformed, scan-format, and certificate-type inputs failed before modifying the trust file.
- Confirmed hashed entry lookup and removal. Confirmed that removal deletes entire matching comma-separated and wildcard ordinary records while preserving `@cert-authority`, `@revoked`, and unrelated records.
- Confirmed evaluated hostname, port, lowercase host-key alias, and strict-checking options with `ssh -G`. The official documentation confirms `ControlPath=none` disables connection sharing.
- The trust model is sound: an independently authenticated fingerprint is required, matching fingerprints do not establish that a machine is uncompromised, and an unverified network scan does not establish trust.
- The replacement is explicitly non-atomic and deliberately restricted to reviewed obsolete ordinary records. These limitations and the need to preserve other valid identities are accurately described.
- The rotation discussion accurately limits `UpdateHostKeys` to authenticated plain-key connections using user trust files. The referenced options are supported in the reviewed release.
- No production host was contacted and no personal or system trust files were modified. Live remote authentication and an actual server rotation were not tested; those steps were checked against official documentation and implementation.
