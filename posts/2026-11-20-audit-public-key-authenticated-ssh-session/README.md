# How to Audit Which Public Key Authenticated Each SSH Session

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Authentication, Auditing, Linux

Description: Correlate OpenSSH authentication fingerprints, certificate identities, and session records while accounting for partial authentication and connection sharing.

An SSH username tells you which account was accessed. A public-key fingerprint identifies the credential that authenticated the connection. To attribute a particular shell or SFTP session, you must join that authentication evidence to the connection's session records and an inventory of credential owners.

The examples use portable OpenSSH, with logging behavior checked against 10.3p1. Distribution patches and logging destinations vary; verify the records your servers actually emit.

## Collect authentication and session evidence

In the applicable server configuration, use:

```text
LogLevel VERBOSE
FingerprintHash sha256
```

On the examined version, successful authentication already logs the key fingerprint at `INFO`. `VERBOSE` adds evidence needed for partial authentication and session correlation; it is not merely a switch that enables fingerprints. The distinction is visible in [OpenSSH's authentication logger](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/auth.c). Avoid continuous `DEBUG` logging: the [configuration manual](https://man.openbsd.org/sshd_config#LogLevel) warns about user privacy.

Merge these settings into the existing configuration, accounting for includes and any conditional `LogLevel` rules. Keep administrative access open, validate, and then reload the actual SSH service through your distribution's normal procedure:

```bash
sudo /usr/sbin/sshd -t -f /etc/ssh/sshd_config
```

[`sshd -t`](https://man.openbsd.org/sshd#t) checks configuration validity and host-key sanity; it does not prove log delivery. Verify that with a new connection afterward.

On a system using the journal, inspect the relevant time window:

```bash
sudo journalctl --since '2026-11-20 10:00:00 UTC' \
  --until '2026-11-20 10:05:00 UTC' \
  --no-pager -o short-iso-precise
```

Replace the timestamps. Start without a unit filter so service naming and session placement do not hide records. Other installations may route authentication messages to `/var/log/auth.log`, `/var/log/secure`, or a central collector. For retained evidence, journal `-o export` preserves structured records; see [journalctl output formats](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html).

## Separate key authorization from completed authentication

This synthetic message illustrates single-key authentication; the fingerprint is abbreviated:

```text
Accepted publickey for deploy from 198.51.100.24 port 54120 ssh2: ED25519 SHA256:KEY_A...
```

Use the complete fingerprint from the original record. Do not classify every line containing `Accepted` as a login: messages such as `Accepted key` or `Accepted certificate` can occur during [authorization checks](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/auth2-pubkeyfile.c) before the client proves possession through a signature. OpenSSH's [public-key authentication implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/auth2-pubkey.c) separates unsigned queries from signed authentication.

Multiple required methods change the sequence. For `AuthenticationMethods publickey,keyboard-interactive:pam`, a synthetic successful sequence could contain:

```text
Partial publickey for deploy from 198.51.100.24 port 54120 ssh2: ED25519 SHA256:KEY_A...
Accepted keyboard-interactive/pam for deploy from 198.51.100.24 port 54120 ssh2
Starting session: shell on pts/2 for deploy from 198.51.100.24 port 54120 id 0
```

The first line proves a successful key step, not completion of the required authentication path. Join it to the final authentication result. A disconnected partial attempt must not become a successful-login entry. With `publickey,publickey`, retain both distinct keys: the first can appear under `Partial` and the second under `Accepted`. These transitions follow the [authentication monitor's method-list handling](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/monitor.c).

An accepted authentication also does not prove that the requested program ran successfully. Keep session-start, errors, termination, and application evidence separate.

## Resolve the fingerprint to an owner

Fingerprint public material from your approved inventory and the account's actual authorization source:

```bash
ssh-keygen -lf /srv/ssh-key-inventory/alice-laptop.pub -E sha256
ssh-keygen -lf /home/deploy/.ssh/authorized_keys -E sha256
```

These are example paths. The daemon may use another `AuthorizedKeysFile`, an `AuthorizedKeysCommand`, or certificate authorities instead of that file. Match the full digest using the same hash algorithm as the logs. [`ssh-keygen -l` and `-E`](https://man.openbsd.org/ssh-keygen#l) provide this comparison without a private key.

Maintain an owner, purpose, approval, and validity history for each fingerprint. Comments such as `alice@laptop` are editable labels, not identity proof. A shared or copied private key identifies the credential used, not which person operated it. Today's `authorized_keys` contents also cannot establish who owned a removed key last month; retain inventory and authorization history.

Certificates need more fields. Inspect the issued public certificate:

```bash
ssh-keygen -L -f /srv/ssh-key-inventory/alice-laptop-cert.pub
```

Record its key ID, serial, principals, validity, and signing CA. The authentication log includes the certificate's key fingerprint, ID, serial, and CA fingerprint. The first fingerprint identifies the underlying public key, not a unique certificate issuance: renewing a certificate around the same key preserves that fingerprint. See [certificate log formatting](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/auth.c) and [fingerprint serialization](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshkey.c).

Join the CA fingerprint and serial to your issuance records, checking the key ID too. This requires your issuer to enforce useful serial uniqueness; neither an ID nor an ungoverned serial alone guarantees a unique person or issuance.

## Join authentication to each session

Preserve the destination host, boot identity, timestamp, username, peer address and source port, process metadata, and surrounding connection records. Journal fields such as `_MACHINE_ID`, `_BOOT_ID`, and `_PID` provide useful context. [Journal field documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd.journal-fields.html)

Do not join solely on username, IP address, or PID. Concurrent connections share usernames and addresses; PIDs are reused, and authentication/session processes can differ across OpenSSH versions. A bastion or NAT also changes the peer address the destination observes.

`Starting session` records identify the session type and a connection-local session number. Keep its lifecycle and timestamps: the number can be reused after closure and is not a globally unique audit ID. OpenSSH's [session implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/session.c) emits these records at `VERBOSE` and deliberately omits ordinary command contents.

With [`ControlMaster`](https://man.openbsd.org/ssh_config#ControlMaster), multiple shells, commands, or SFTP sessions share one authenticated connection. They inherit its authentication context; there is no new key authentication for each channel. A forwarding-only connection may never open a shell session. For a controlled verification attempt, [`ssh -S none`](https://man.openbsd.org/ssh#S) disables connection sharing while preserving your configured route and host trust.

## Keep optional session evidence in perspective

`ExposeAuthInfo yes` exposes a temporary file through `SSH_USER_AUTH`, listing successful authentication methods and public credentials. Inside an authorized session, inspect it with:

```bash
if [ -n "${SSH_USER_AUTH:-}" ] && [ -r "$SSH_USER_AUTH" ]; then
    cat "$SSH_USER_AUTH"
fi
```

This is useful diagnostic evidence, not durable audit storage. OpenSSH creates the file as the authenticated user and removes it during connection cleanup; that user can modify it. See [ExposeAuthInfo](https://man.openbsd.org/sshd_config#ExposeAuthInfo) and [file creation and cleanup](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/session.c).

Retain server-originated records in protected central storage with synchronized clocks and monitored ingestion. Missing historical fingerprints cannot be reconstructed reliably from `last`, shell history, or the current key list. Report incomplete evidence explicitly, and verify collection with raw-key, certificate, partial-failure, and multiplexed-session examples before relying on the audit trail.
