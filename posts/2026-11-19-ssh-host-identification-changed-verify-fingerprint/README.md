# “REMOTE HOST IDENTIFICATION HAS CHANGED”: How to Verify the New Fingerprint Before Editing `known_hosts`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Security, Troubleshooting

Description: Verify a changed SSH host key through a trusted channel, identify the exact known_hosts entry, and reconnect with host verification intact.

The warning means the server key presented for this destination conflicts with saved trust. A rebuild, deliberate key rotation, changed DNS destination, or an impersonator could explain it. The warning alone cannot distinguish them. Deleting an entry removes evidence of the previous identity; it does not establish the new identity. [OpenSSH host authentication](https://man.openbsd.org/ssh)

Keep the failed command and warning, including the offered key type, SHA256 fingerprint, and offending file and line. Confirm which machine should now own the destination before changing trust.

## Identify the name and files SSH actually checks

Run the same command with `-G`, retaining its configuration file, port, username, and other options. For an existing alias named `app-prod`:

```bash
ssh -G app-prod | awk '
$1 ~ /^(hostname|port|user|hostkeyalias|userknownhostsfile|globalknownhostsfile|knownhostscommand|checkhostip)$/ {print}
'
```

`-G` prints evaluated configuration and exits. Inspect every configured user and global trust file, plus any `KnownHostsCommand` supplying managed records. A failure from `/etc/ssh/ssh_known_hosts` needs its administrator's update; clearing your personal file does not repair that record. [SSH options](https://man.openbsd.org/ssh#G), [trust-file configuration](https://man.openbsd.org/ssh_config#UserKnownHostsFile)

The command-line nickname is not necessarily the lookup name:

| Effective configuration | Lookup token |
| --- | --- |
| `HostName app.example.com`, port 22, no `HostKeyAlias` | `app.example.com` |
| Same hostname, port 2222, no `HostKeyAlias` | `[app.example.com]:2222` |
| `HostKeyAlias app-prod-trust`, including on port 2222 | `app-prod-trust` |

OpenSSH lowercases `HostKeyAlias` before lookup; it does not automatically wrap the effective alias as `[alias]:port`. Without an alias, it constructs the hostname/port token; for a new nondefault-port destination, it can also try the hostname without the port. Canonicalization can change the hostname. If `CheckHostIP` produces an address-related warning, investigate that address entry separately. Follow the actual warning and debug output rather than removing every related name. [OpenSSH alias normalization](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh.c#L1290-L1292), [OpenSSH lookup implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshconnect.c), [hostname configuration](https://man.openbsd.org/ssh_config#CanonicalizeHostname)

For the second table row, assuming the warning identifies your ordinary user file:

```bash
lookup='[app.example.com]:2222'
known="$HOME/.ssh/known_hosts"
ssh-keygen -F "$lookup" -f "$known"
ssh-keygen -F "$lookup" -f "$known" -l -E sha256
```

`-F` finds hashed entries too; plain text searching can miss them. Repeat against other relevant configured files. No match means you should recheck the lookup token and file, not erase the file. [Lookup options](https://man.openbsd.org/ssh-keygen#F)

## Obtain independent evidence of the replacement key

Use an authenticated management console, a trusted provisioning inventory, or an administrator contacted through an established channel. Bind the evidence to the correct environment, machine identity, endpoint, and change record. A message saying “we rebuilt it” is useful context, but still obtain the new key's fingerprint.

From that trusted console, an administrator can fingerprint the server's configured public host key:

```bash
# On the intended server through the trusted management channel.
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256
```

Use the active server's actual `HostKey` path and the algorithm presented in the warning. Servers can have several host keys; an RSA fingerprint cannot validate an Ed25519 key. A leftover public-key file is not proof that the running SSH service uses it. [Server host-key configuration](https://man.openbsd.org/sshd_config#HostKey), [fingerprint verification](https://man.openbsd.org/ssh#VERIFYING_HOST_KEYS)

Compare the entire SHA256 fingerprint and key type. If they differ, or you cannot authenticate the evidence, stop and investigate routing, DNS, inventory, and the server change. A matching fingerprint establishes correspondence with that trusted record; it does not prove the machine is uncompromised.

`ssh-keyscan` only collects what an endpoint presents. Scanning the same untrusted network path twice, or comparing a scan with the warning, does not create independent verification. Its manual explicitly requires verification of collected keys before trusting them. Do not pipe scan output directly into `known_hosts` as a repair. [ssh-keyscan security](https://man.openbsd.org/ssh-keyscan)

For the example below, obtain the corresponding **single plain public host key** through the trusted channel and save it locally as `verified-host.pub`. Never transfer the server's private host key. Check the received file against the trusted fingerprint too:

```bash
ssh-keygen -lf ./verified-host.pub -E sha256
```

Proceed only after that succeeds and the full fingerprint matches.

## Replace only the reviewed stale records

Review the earlier `-F` results before choosing a removal method. `ssh-keygen -R` removes **all matching ordinary host-key records**, including different key types and hashed records; it does not select only the algorithm mentioned in the warning. A matching comma-separated hostname/alias line or wildcard line is removed as a whole. Preserve still-valid keys and trust for other names with a targeted edit when necessary. [Removal options](https://man.openbsd.org/ssh-keygen#R), [known_hosts format](https://man.openbsd.org/sshd#SSH_KNOWN_HOSTS_FILE_FORMAT)

Only when every matching ordinary record in this file is obsolete for **all names it covers**, run this replacement in the same shell as the `lookup` and `known` assignments. Inspect `verified-host.pub` first: it must contain exactly the one verified public-key line, not scan output or a certificate.

```bash
(
set -e
key=$(awk '
NR != 1 || NF < 2 || $1 ~ /-cert/ {bad = 1}
{print $1, $2}
END {exit (bad || NR != 1)}
' ./verified-host.pub)
printf '%s\n' "$key" | ssh-keygen -lf /dev/stdin -E sha256
backup=$(mktemp "${known}.before-rotation.XXXXXX")
cp -p "$known" "$backup"
printf 'Backup: %s\n' "$backup"
ssh-keygen -R "$lookup" -f "$known"
printf '%s %s\n' "$lookup" "$key" >> "$known"
ssh-keygen -F "$lookup" -f "$known" -l -E sha256
)
```

The guard requires one line, rejects certificate key types, and keeps only the key type and encoded key. The fingerprint command then parses that normalized key; your earlier comparison supplies the trust decision. `ssh-keygen -l` alone can accept multiple keys or skip malformed lines, so its successful exit is not sufficient input validation. Keep the explicit backup even though `-R` also creates an `.old` file, which later runs can replace. Review the final fingerprint and the file diff. If a later command fails, stop and inspect the file against the backup; the sequence is not atomic. Do not delete the whole file or bypass checking to make the warning disappear.

Treat `@cert-authority` and `@revoked` records as managed trust policy. Certificate failures require checking the trusted CA, hostname/principals, and validity; removing a CA or revocation record is not ordinary stale-key cleanup. [Host certificate and revocation records](https://man.openbsd.org/sshd#SSH_KNOWN_HOSTS_FILE_FORMAT)

## Prove a fresh verified connection succeeds

Reconnect using the original destination and options, with strict checking and connection reuse disabled:

```bash
ssh -vv -o StrictHostKeyChecking=yes \
  -o ControlPath=none app-prod
```

Confirm the debug output reports a matching trusted host key, then complete normal user authentication and run an appropriate harmless command such as `id`. `Permission denied (publickey)` after successful host verification is a separate user-authentication problem. An unknown-host or changed-key error means the trust repair is incomplete. [Strict checking](https://man.openbsd.org/ssh_config#StrictHostKeyChecking), [authentication sequence](https://man.openbsd.org/sshd#AUTHENTICATION)

For future planned rotations, `UpdateHostKeys` can learn replacement keys after an authenticated connection, before the old key disappears. It requires plain-key trust through `UserKnownHostsFile`, not certificate or global-file authentication. It cannot repair a connection whose existing trust already fails. [Rotation behavior](https://man.openbsd.org/ssh_config#UpdateHostKeys)
