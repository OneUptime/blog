# How to Rotate SSH Host Keys Gracefully with `UpdateHostKeys`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Security, Linux

Description: Rotate plain SSH host keys through an overlap window, verify that clients persist replacement trust, and retire old keys without surprising disconnected clients.

A planned host-key rotation needs a bridge from existing trust to replacement trust. With `UpdateHostKeys`, clients authenticate the server using a trusted key, complete user authentication, and then learn additional public host keys. The server proves possession of the corresponding private keys. Keep the old key available until clients have saved the replacement. [OpenSSH host-key update protocol](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL)

This workflow assumes a healthy server and uncompromised old key. If either is compromised, trusting its announcement of a replacement is insufficient; distribute verified replacement trust through an independent channel and handle revocation separately.

## Establish which clients can learn

OpenSSH introduced this mechanism in 6.8. Check deployed versions and vendor behavior rather than assuming every SSH library implements it. [OpenSSH 6.8 release notes](https://www.openssh.org/txt/release-6.8)

Additional keys require a trusted or explicitly accepted **plain host key** authenticated through `UserKnownHostsFile`. Certificate authentication and global-file authentication do not qualify. OpenSSH also disables updates when host authentication comes from `KnownHostsCommand`; maintain those managed trust sources through their own distribution process. [Client prerequisites](https://man.openbsd.org/ssh_config#UpdateHostKeys), [trust-source handling](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshconnect.c)

The current default enables updates only when the default `UserKnownHostsFile` has not been overridden and `VerifyHostKeyDNS` has not been enabled. Set the intended policy explicitly, especially with custom files. `ask` requests confirmation and is incompatible with `ControlPersist`; use `yes` for approved unattended learning. [UpdateHostKeys configuration](https://man.openbsd.org/ssh_config#UpdateHostKeys)

For an existing alias whose old key is already trusted, merge these settings into its client configuration before broader defaults:

```sshconfig
Host app-prod
    HostName app.example.com
    UpdateHostKeys yes
    StrictHostKeyChecking yes
```

Inspect the effective configuration:

```bash
ssh -G app-prod | awk '
$1 ~ /^(hostname|port|hostkeyalias|userknownhostsfile|globalknownhostsfile|knownhostscommand|verifyhostkeydns|updatehostkeys|hostkeyalgorithms)$/ {print}
'
```

Keep existing user authentication, routing, and organizational trust policy. This example assumes port 22, no host-key alias, and ordinary user-file trust. Inspect actual files and verbose connection output if your configuration differs. `ssh -G` prints evaluated configuration without opening an SSH session; configured canonicalization and `Match exec` rules can still perform lookups or run local commands. [SSH command options](https://man.openbsd.org/ssh#G), [configuration evaluation](https://man.openbsd.org/ssh_config)

## Load old and new keys together

Inventory every client identity and trust store: laptops, deployment accounts, bastions that initiate SSH, and scheduled jobs. Set an overlap window that includes infrequent jobs and offline devices. Keep console recovery available and an administrative session open throughout server changes.

On the server, generate a replacement under an **unused path**. This example assumes Ed25519 is permitted by the fleet's crypto policy. Do not overwrite the current key or an existing staged replacement:

```bash
sudo ssh-keygen -t ed25519 -N '' \
  -f /etc/ssh/ssh_host_ed25519_key.next -C 'app-prod-next'
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.next.pub -E sha256
```

Record the replacement fingerprint through the trusted management channel. The empty passphrase permits unattended daemon startup; protect the private file with root ownership and mode `0600`, including required platform security labels. Distribute only public keys to clients. [Key generation](https://man.openbsd.org/ssh-keygen), [HostKey permissions](https://man.openbsd.org/sshd_config#HostKey)

Keep the old key first and add the new key in the server's global configuration. Preserve other intentionally configured host keys:

```text
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_ed25519_key.next
```

In OpenSSH 10.3p1, initial key selection uses the first matching key of a given type, while the post-authentication announcement includes both. Thus clients that know only the old Ed25519 key can authenticate and learn the next one. Verify this ordering on your deployed build and inspect included configuration files. `UpdateHostKeys` itself is a **client** option. [Initial key selection](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd-auth.c), [host-key announcement](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd-session.c)

```bash
sudo /usr/sbin/sshd -t
sudo /usr/sbin/sshd -T | awk '$1 == "hostkey" {print}'
```

Use the running service's actual executable and configuration path. Stop on validation failure; otherwise reload that service using your distribution's service manager. A reload loads the new configuration for new connections. [Daemon validation and reload behavior](https://man.openbsd.org/sshd)

## Verify learning reached disk

On each representative client, back up the actual user trust file before the learning connection. For this example:

```bash
known="$HOME/.ssh/known_hosts"
backup=$(mktemp "${known}.before-rotation.XXXXXX") &&
  cp -p "$known" "$backup" &&
  ssh -vvv -o ControlPath=none app-prod
```

The command chain stops if backup creation fails. Complete normal user authentication, including MFA. Keep the connection open until host-key processing finishes, then exit. Disabling connection reuse forces a new handshake. A failed user login cannot complete this learning workflow. [Authentication and extension ordering](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd-session.c)

Inspect the saved records:

```bash
ssh-keygen -F app.example.com -f "$known" -l -E sha256
```

Require both old and new fingerprints, comparing the new one with your trusted server-side record. `-F` also finds hashed entries. Use the effective hostname/port token or host-key alias when applicable. [Host lookup options](https://man.openbsd.org/ssh-keygen#F)

A successful login is insufficient. Even a verbose learning message precedes the file write. Check the resulting file and write errors. In 10.3p1, additions go to the first `UserKnownHostsFile`; that file must exist, persist across runs, and support replacement in its directory. [Update implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/clientloop.c), [file replacement implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/hostfile.c)

If learning stalls, check that `HostKeyAlgorithms` permits the replacement. Wildcards, complex host lists, CA/revocation markers, or keys reused under other names can make OpenSSH skip automatic updates. Investigate the debug explanation rather than removing policy records. [Client update guards](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/clientloop.c)

Ephemeral CI jobs need their maintained trust source updated; learning into a disposable filesystem does not help the next job. For multiple servers behind one hostname, coordinate their advertised key sets so successive connections do not treat another backend's key as obsolete.

## Retire with a fresh replacement-only check

Before retirement, account for every required client: it has either persisted the replacement or received it through authenticated configuration management. Elapsed time and a quiet error dashboard are insufficient evidence for disconnected clients.

On a canary server, remove only the old Ed25519 `HostKey` directive, validate, and reload. From a migrated client, require a fresh connection using Ed25519:

```bash
ssh -vv -o ControlPath=none -o UpdateHostKeys=no \
  -o HostKeyAlgorithms=ssh-ed25519 app-prod id
```

Require the new fingerprint and a matching saved user-file entry in debug output, plus successful user authentication. Disabling updates for this probe tests already persisted trust. Then reconnect with updates enabled and verify that the retired key disappears from the applicable user-file records. OpenSSH removes obsolete keys after a successful update, subject to its update guards. [Retirement processing](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/clientloop.c)

Roll out removal after the canary passes. A client that missed overlap and has no remaining trusted server key needs independently verified replacement trust; automatic updates cannot repair its failed initial host authentication. During a healthy planned rotation, rollback can restore the reviewed overlap configuration. Retire old private-key material under your retention policy after replacement access and recovery procedures are verified.
