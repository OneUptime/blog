# How to Revoke Compromised SSH Keys and Certificates with an OpenSSH KRL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSSH, SSH, Security, Linux

Description: Revoke SSH keys, certificate serials, and compromised CAs with an OpenSSH KRL, preserve existing revocations, and verify enforcement across servers and clients.

A stolen SSH private key remains usable wherever it is authorized until you change enforcement. OpenSSH's Key Revocation List (KRL) provides a compact deny list, but generating the file is only the first step: the machines making authentication decisions must receive and use it.

Keep an independent recovery path and an administrative session available while rolling out revocation. Stop unauthorized certificate issuance and identify affected accounts, servers, bastions, and automation before declaring containment complete.

## Choose the right revocation scope

Record the compromised public key's fingerprint and, when applicable, the certificate's signing CA, serial, and key ID:

```bash
ssh-keygen -lf compromised.pub -E sha256
ssh-keygen -L -f compromised-cert.pub
```

These identifiers answer different questions:

| Incident | What to revoke | Result when the KRL is enforced |
|---|---|---|
| A user's or host's private key leaked | Its plain public key | Rejects that key and certificates containing it, regardless of issuer |
| One issuance must be withdrawn while the key remains safe | Certificate serial under its issuing CA | Rejects certificates with that CA and serial; leaves the raw key usable |
| A CA private key leaked | The CA public key | Rejects certificates signed by that CA, including newly forged ones |

OpenSSH checks the certificate's underlying public key, its certificate revocation records, and its signing CA. A copied public certificate alone does not supply the private key needed to authenticate. [KRL checking implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/krl.c), [public-key authentication implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkey.c)

Passing a certificate file to `ssh-keygen -k` revokes its nonzero serial under that CA. A serial-zero certificate is instead revoked by its key ID. Reused serials or IDs can therefore revoke multiple certificates. This does **not** revoke the underlying raw key; for a stolen private key, use its plain public key. [Certificate revocation selection](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/krl.c)

## Build a candidate without losing older revocations

Work in a protected publishing directory, with one publisher at a time. If an authoritative KRL already exists, copy it and update the copy:

```bash
(
set -e
cp revoked-keys.krl revoked-keys.next.krl
ssh-keygen -k -u -f revoked-keys.next.krl compromised.pub
)
```

Stop on failure. The `-u` flag preserves existing entries. Only when creating your first KRL, with no earlier revocations to preserve, initialize it instead:

```bash
ssh-keygen -k -f revoked-keys.next.krl compromised.pub
```

For certificate-only revocation, substitute the certificate file for `compromised.pub`, or add records from the issuer's inventory. Here, serial `4102` and the inclusive range `4200–4210` belong to the CA in `user_ca.pub`:

```bash
(
set -e
cat > revoke.spec <<'EOF'
serial: 4102
serial: 4200-4210
EOF
ssh-keygen -k -u -f revoked-keys.next.krl \
  -s user_ca.pub revoke.spec
)
```

For key-ID revocation, use a specification line such as `id: alice-laptop-20261120` with the same `-s` argument. This identifies the certificate's exact key ID, not a login principal. Serial zero cannot be targeted with a `serial:` record. [KRL specification and update options](https://man.openbsd.org/ssh-keygen#KEY_REVOCATION_LISTS)

If the CA itself is compromised, add its **public key as input**, rather than merely supplying it through `-s`:

```bash
ssh-keygen -k -u -f revoked-keys.next.krl user_ca.pub
```

That broader action rejects every certificate from the CA. Stop its signing service and remove its trust entries through your incident response process; replacing only known leaf certificates cannot address an attacker who can issue more.

## Check both rejection and continued access

Parse and inspect the candidate, then query individual incident and control credentials:

```bash
ssh-keygen -Q -l -f revoked-keys.next.krl
ssh-keygen -Q -f revoked-keys.next.krl compromised.pub
ssh-keygen -Q -f revoked-keys.next.krl compromised-cert.pub
ssh-keygen -Q -f revoked-keys.next.krl replacement-cert.pub
```

For successfully parsed inputs, `REVOKED` produces exit status `1`; `ok` produces `0`. Missing files and parsing errors also produce nonzero status, so a failed command alone is insufficient evidence. Require the expected per-file result and inspect diagnostics. An `ok` result only means the KRL does not revoke that credential. [Query implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/ssh-keygen.c)

Include a previously revoked credential to catch lost history, a newly revoked credential, and an unrelated valid credential. After certificate-only revocation, also query the raw key to verify the intended difference. Run these checks using the OpenSSH versions deployed in your fleet.

## Publish and enable enforcement

Distribute the candidate through authenticated configuration management. Record its checksum and deployment revision, and detect hosts still running older copies. A local KRL does not fetch updates automatically. Treat freshness and rollback prevention as deployment responsibilities. OpenSSH 9.4 and later reject embedded KRL signatures; do not assume the file authenticates its own publisher. [KRL format and signature limitations](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL.krl)

For **user authentication**, configure the server's effective `sshd_config`:

```text
RevokedKeys /etc/ssh/revoked-keys.krl
```

Install the file before enabling this setting. An unreadable revocation file causes public-key authentication to fail for all users. Never edit the live KRL in place. On Linux, stage and rename within the same directory, with one deployment process per host:

```bash
(
set -e
sudo install -o root -g root -m 0644 revoked-keys.next.krl \
  /etc/ssh/revoked-keys.krl.next
sudo ssh-keygen -Q -l -f /etc/ssh/revoked-keys.krl.next
sudo mv /etc/ssh/revoked-keys.krl.next /etc/ssh/revoked-keys.krl
)
```

Preserve required SELinux labels. If you changed daemon configuration, run `sudo sshd -t` and reload the correct SSH service for your distribution. Replacing the KRL at its existing configured path is consulted by subsequent authentication attempts; configuration validation alone does not test revocation. [RevokedKeys behavior](https://man.openbsd.org/sshd_config#RevokedKeys), [revocation file loading](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth.c)

For **host authentication**, distribute the relevant KRL to clients and configure their effective `ssh_config`:

```text
Host *
    RevokedHostKeys /etc/ssh/revoked-host-keys.krl
```

Publish that file first too: a missing or unreadable file prevents host authentication wherever this setting applies. A server-side `RevokedKeys` setting does not distribute host revocations to clients. [RevokedHostKeys](https://man.openbsd.org/ssh_config#RevokedHostKeys)

## Prove enforcement with fresh connections

Test on a canary before expanding deployment. For an Ed25519 user certificate and a canary account requiring public-key authentication alone:

```bash
ssh -F /dev/null -vv \
  -o ControlPath=none -o IdentityAgent=none -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  -o PubkeyAcceptedAlgorithms=ssh-ed25519-cert-v01@openssh.com \
  -o StrictHostKeyChecking=yes \
  -i ./canary-key -o CertificateFile=./canary-cert.pub \
  canary@server.example.com id
```

Use the matching private key and supply required routing and managed host-trust paths explicitly. This isolates the certificate and prevents an existing multiplexed connection, another agent identity, or the raw key from making the probe succeed. Preserve production MFA in representative workflow tests. [Client authentication settings](https://man.openbsd.org/ssh_config), [configuration isolation](https://man.openbsd.org/ssh#F)

Require rejection of a still-valid revoked credential, success with an unaffected replacement, and server logs attributing rejection to revocation. Network failure or certificate expiry proves nothing about the KRL.

For host revocation probes using `-F /dev/null`, explicitly add `-o RevokedHostKeys=/etc/ssh/revoked-host-keys.krl`; the isolated command ignores that setting in client configuration files. Select the intended host key or certificate with `HostKeyAlgorithms` and require client diagnostics identifying revocation. Test an unaffected replacement too. [Host revocation and algorithm settings](https://man.openbsd.org/ssh_config)

Revocation affects authentication decisions; it does not terminate established sessions or remove an attacker's other credentials. Investigate and end affected sessions separately, replace stolen private keys, and verify fleet deployment before closing the incident.
