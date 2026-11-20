# How to Rotate an OpenSSH Certificate Authority Without Locking Out Existing Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSSH, SSH, Security, Linux

Description: Rotate OpenSSH user and host certificate authorities with overlapping trust, isolated authentication checks, and explicit gates for retiring the old CA.

An SSH CA rotation has three distinct changes: distribute new trust, issue replacement certificates, and remove old trust. Reversing that order makes otherwise valid credentials stop working. Treat each stage as a fleet rollout with evidence that it has reached every relevant machine.

This runbook focuses on a planned **user CA** rotation: servers trust the CA that signs users' keys. Host CA rotation changes what clients trust and needs a separate rollout, described below. OpenSSH certificates do not support certificate chains; signing a new CA with the old CA does not create an inherited trust path. [OpenSSH certificate protocol](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL.certkeys)

## Establish the retirement deadline

Inventory servers, bastions, automation accounts, offline laptops, and provisioning templates. Record both CA fingerprints, the old issuer's shutdown time, and the latest `valid before` among certificates it has issued. A default eight-hour lifetime is insufficient evidence if exceptions received longer certificates. OpenSSH's CA public key is a trust anchor, not an expiring X.509 root certificate. Certificate validity is a separate field. [Certificate format](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL.certkeys)

Before changes, verify an independent recovery path and keep an administrative session open. Record the current trust configuration and its backup. Inventory `TrustedUserCAKeys` plus CA entries supplied through `authorized_keys` and `AuthorizedKeysCommand`; removing one file's CA entry does not retire another authorization path. [User authorization sources](https://man.openbsd.org/sshd_config#AuthorizedKeysCommand), [cert-authority entries](https://man.openbsd.org/sshd#cert-authority)

## Distribute overlapping user trust

Generate the replacement on your protected signing system, using an algorithm supported by the fleet's crypto policy. This example assumes Ed25519 is permitted:

```bash
ssh-keygen -t ed25519 -f ./user_ca_v2 -C 'user-ca-v2'
ssh-keygen -lf ./user_ca_v2.pub -E sha256
```

Protect the private key with your signing system's normal controls; distribute only the public key through authenticated configuration management.

`TrustedUserCAKeys` accepts multiple CA public keys, one per line. Keep the existing directive pointed at a managed bundle:

```text
TrustedUserCAKeys /etc/ssh/trusted-user-ca-keys
```

Build the bundle from verified old and new public keys. Preserve other intentionally trusted CAs. Run one publisher at a time for these staging paths, including on each destination server:

```bash
(
set -e
bundle_tmp=$(mktemp ./trusted-user-ca-keys.XXXXXX)
trap 'rm -f "$bundle_tmp"' EXIT
cat user_ca_v1.pub user_ca_v2.pub > "$bundle_tmp"
ssh-keygen -lf "$bundle_tmp" -E sha256
mv "$bundle_tmp" trusted-user-ca-keys.next
)
```

Stop on failure. Review both fingerprints against the trusted records before running the installation below; successful parsing alone does not establish trust. On Linux, replacing a staged file in the same directory avoids exposing a partially written bundle:

```bash
(
set -e
sudo install -o root -g root -m 0644 trusted-user-ca-keys.next \
  /etc/ssh/trusted-user-ca-keys.next
sudo mv /etc/ssh/trusted-user-ca-keys.next /etc/ssh/trusted-user-ca-keys
sudo sshd -t
)
```

Retain required SELinux labeling on systems that enforce it. If you changed `sshd_config`, validate it and reload the correct service for your distribution. A configuration check does not prove authentication works. [CA bundle configuration](https://man.openbsd.org/sshd_config#TrustedUserCAKeys), [sshd validation and reload behavior](https://man.openbsd.org/sshd)

## Prove both CAs work before switching issuance

Use a canary account and keep separate old and new certificate files. Sign a copy of the canary's existing public key so the old certificate is not overwritten:

```bash
# On the signing system; alice.pub is the canary's public key.
cp alice.pub alice-new.pub
ssh-keygen -s ./user_ca_v2 -I 'rotation-canary-v2' -z 42 \
  -n alice -V -5m:+8h -O clear -O permit-pty alice-new.pub
ssh-keygen -L -f alice-new-cert.pub
```

This deliberately limited shell canary has no forwarding permissions. Allocate production serials through your issuer, and preserve each account's existing principals, critical options, extensions, and authorization policy when reissuing real credentials. Check the signing CA fingerprint and validity interval in `-L` output. The five-minute backdating allowance is an example, not a substitute for synchronized clocks. [Signing and certificate options](https://man.openbsd.org/ssh-keygen#CERTIFICATES)

Return the new certificate to the canary's client. For an Ed25519 key and an account requiring only public-key authentication, run:

```bash
ssh -F /dev/null -vv \
  -o ControlPath=none -o IdentityAgent=none -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  -o PubkeyAcceptedAlgorithms=ssh-ed25519-cert-v01@openssh.com \
  -o StrictHostKeyChecking=yes \
  -i ./alice-key -o CertificateFile=./alice-new-cert.pub \
  alice@canary.example.com id
```

Use the matching private key; a local passphrase prompt is expected if it is encrypted. The client configuration is deliberately isolated, so explicitly supply any required port, jump routing, or managed host-trust file. Keep host verification enabled. `ControlPath=none` forces a new connection, while the certificate-only algorithm selection prevents success through the underlying raw key. The explicit certificate and disabled agent exclude unrelated credentials. [Client identity and authentication settings](https://man.openbsd.org/ssh_config), [configuration isolation](https://man.openbsd.org/ssh#F)

Repeat with `alice-old-cert.pub`. Require both to succeed and correlate each attempt with server authentication logs identifying the certificate and signing CA. Then test representative accounts and real workflows, completing any required MFA through their normal flow. Do not disable production MFA to fit this canary command.

## Switch issuance, then retire trust

After overlap is verified across the fleet, switch every issuer to the new CA and stop old-CA issuance. Reissue credentials for people, scheduled jobs, and deployment systems. Track missing renewals and actual authentication failures; a quiet dashboard does not establish that an offline laptop can reconnect.

Remove old trust only after replacement access is verified and old credentials are migrated or have expired, allowing for clock error. If migration permits earlier retirement, prove rejection with a **still-valid** old canary certificate. If all old certificates have expired, inspect the deployed trust configuration instead; a failed login cannot isolate CA removal from expiry.

For that negative test, install the new-only bundle on a canary server and repeat both isolated probes. The new certificate must succeed; the still-valid old one must fail because its CA is no longer authorized. Confirm that reason in server logs, using temporary debug logging if needed. Network errors, wrong principals, expiry, and generic SSH exit status are not retirement evidence. Check alternative CA authorization paths before rolling removal across the fleet. Authentication decisions include several independent checks. [OpenSSH authentication implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkey.c)

During a planned rotation, rollback means restoring the reviewed overlap bundle and retesting fresh connections. Existing sessions are not proof of working replacement access. After completion, retire the old signing key under your key-management policy and update recovery images and templates. A compromised CA requires an incident response and prompt revocation; an overlap window preserves trust in that compromised key.

## Apply the same ordering to host CAs

For host certificates, distribute both host CA public keys to clients as separate `@cert-authority` entries with the existing hostname scope. Only then install host certificates signed by the new host CA through each server's `HostCertificate` configuration. Preserve the correct host principals and matching private host key. Validate and reload `sshd` to load each replacement. [Host trust entries](https://man.openbsd.org/sshd#SSH_KNOWN_HOSTS_FILE_FORMAT), [HostCertificate](https://man.openbsd.org/sshd_config#HostCertificate)

For the host-CA probe, use `-F /dev/null`, `ControlPath=none`, `StrictHostKeyChecking=yes`, and a certificate-only `HostKeyAlgorithms` selection appropriate to the host key. Point `UserKnownHostsFile` at an isolated file containing only the reviewed, correctly scoped `@cert-authority` entries; set `GlobalKnownHostsFile=/dev/null`, `KnownHostsCommand=none`, and `VerifyHostKeyDNS=no`. Explicitly supply any required routing. A secure DNS SSHFP match can otherwise authenticate the underlying host key before CA validation. [Host verification implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/sshconnect.c)

Require a successful fresh connection and verbose client output identifying the presented certificate, expected signing CA, and matching CA trust entry, with no subsequent certificate-validation failure. Test representative clients with their deployed trust configuration too. Remove old client trust from all managed known-hosts files and commands after every server presents a verified replacement, including rarely used recovery endpoints. User CA trust and host CA trust need separate completion evidence.
