# OpenSSH Upgrade Broke RSA Login: Fix “sign_and_send_pubkey: no mutual signature supported” Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Security, Troubleshooting

Description: Diagnose RSA signature negotiation failures after OpenSSH upgrades, restore SHA-2 authentication, and limit any temporary SHA-1 exception to one destination.

An SSH upgrade can leave an unchanged RSA key unable to log in:

```text
sign_and_send_pubkey: no mutual signature supported
```

This message comes from client-side selection of a signature algorithm for user authentication. It does not establish that the key is corrupt or missing from `authorized_keys`. Identify the attempted key and the algorithms both ends support before replacing credentials or changing security settings. The [OpenSSH signing implementation](https://github.com/openssh/openssh-portable/blob/V_10_6_P2/sshconnect2.c#L1308) shows where this failure occurs.

## Separate the RSA key from its signature

These names describe different things:

| Name or location | Meaning |
| --- | --- |
| `ssh-rsa` at the start of an RSA `.pub` file | RSA public-key encoding |
| `ssh-rsa` in a signature-algorithm list | RSA signature using SHA-1 |
| `rsa-sha2-256` / `rsa-sha2-512` | RSA signatures using SHA-256 / SHA-512 |

The same RSA key can produce SHA-2 signatures. Its public-key file can still begin with `ssh-rsa`; editing that prefix does not upgrade it. [RFC 8332](https://www.rfc-editor.org/rfc/rfc8332.html#section-3) defines SHA-2 algorithms that reuse the existing RSA public-key format.

OpenSSH has supported RSA SHA-2 signatures since **7.2**. **8.8** disabled RSA SHA-1 signatures by default, without disabling RSA keys generally. Existing RSA keys automatically use stronger signatures when the peers support them. These are upstream milestones, not a reason to install an obsolete release; use a supported vendor version. See the [OpenSSH 8.8 release notes](https://www.openssh.org/releasenotes.html#8.8).

There are also two authentication directions. `HostKeyAlgorithms` concerns the server proving its identity. Client-side `PubkeyAcceptedAlgorithms` controls signatures used to authenticate your account. A separate error, `no matching host key type found`, happens during host-key negotiation. Adding a host-key exception alone does not fix the user-authentication signature failure. See the [OpenSSH legacy compatibility guide](https://www.openssh.org/legacy.html).

## Inspect the failing connection

Use your actual destination, account, and identity path in these examples. Preserve the same alias, port, and proxy settings used by the failing application.

```bash
ssh -V
ssh -G -i ~/.ssh/deploy_rsa deploy@legacy.example.com |
  awk '$1 ~ /^(hostname|user|port|identityfile|identitiesonly|pubkeyacceptedalgorithms|pubkeyacceptedkeytypes|hostkeyalgorithms)$/ {print}'
ssh-keygen -lf ~/.ssh/deploy_rsa.pub
```

[`ssh -G`](https://man.openbsd.org/ssh#G) prints evaluated configuration and exits without an SSH connection. Existing `Match exec` rules can still execute commands, so use trusted configuration. Check for an unexpected identity or an algorithm list that excludes both RSA SHA-2 variants. The [fingerprint command](https://man.openbsd.org/ssh-keygen#l) identifies the public key without displaying private material.

Then make a diagnostic connection:

```bash
ssh -vv -S none -o IdentitiesOnly=yes \
  -i ~/.ssh/deploy_rsa deploy@legacy.example.com
```

[`-S none`](https://man.openbsd.org/ssh#S) prevents reuse of an already authenticated connection. `IdentitiesOnly` excludes unrelated agent identities, but other configured identity files can still participate. Compare the fingerprint in the attempted-key messages with the public-key fingerprint above.

Read the failure in context: the remote software banner, `Offering public key` or `Trying private key`, and any `server-sig-algs` information. The server's advertised list helps OpenSSH select an RSA signature; missing or incompatible advertisements can prevent SHA-2 selection even when a server implementation has some SHA-2 support. This selection logic is visible in [OpenSSH's algorithm-selection code](https://github.com/openssh/openssh-portable/blob/V_10_6_P2/sshconnect2.c#L1081).

`ssh -Q PubkeyAcceptedAlgorithms` lists local implementation capabilities. It does not report the destination's capabilities or the effective allowlist for that host. Use `-G` and connection diagnostics for those questions. Redact account names, paths, and infrastructure details before sharing debug output.

## Restore modern authentication first

If the server is old, upgrade its SSH implementation or appliance firmware to support interoperable RSA SHA-2 authentication. If a custom allowlist removed SHA-2, correct that policy. A healthy existing RSA key need not change merely because SHA-1 is disabled.

If the server was upgraded and now rejects an old client's SHA-1 signatures, upgrade the client instead. Server-side [`PubkeyAcceptedAlgorithms`](https://man.openbsd.org/sshd_config#PubkeyAcceptedAlgorithms) controls what it accepts; changing the laptop's setting cannot override the server. An administrator can inspect the effective server policy with `sshd -T`, supplying `-C` connection details when `Match` rules apply. Validate proposed server configuration with [`sshd -t`](https://man.openbsd.org/sshd#t), and retain a working administrative session while testing changes.

If diagnostics report agent or hardware-token signing failures, check that signing component's SHA-2 support too. A different key type such as Ed25519 is another migration option when both endpoints and local policy support it. Install and test the new public key through an authorized access path before retiring the old one.

## Use a temporary exception only for the affected host

When the identified legacy server requires RSA SHA-1 for user authentication and immediate access is necessary, test a single invocation:

```bash
ssh -vv -S none -o IdentitiesOnly=yes \
  -o PubkeyAcceptedAlgorithms=+ssh-rsa \
  -i ~/.ssh/deploy_rsa deploy@legacy.example.com
```

For a short migration window, place a specific block before general defaults in `~/.ssh/config`:

```sshconfig
Host legacy-build
    HostName legacy.example.com
    User deploy
    IdentityFile ~/.ssh/deploy_rsa
    IdentitiesOnly yes
    # Temporary: remove after the scheduled server upgrade.
    PubkeyAcceptedAlgorithms +ssh-rsa
```

The `+` preserves the default algorithms and adds the exception. Without it, the list is replaced. Do not put this exception under `Host *`. The first obtained value normally wins, so confirm the block actually applies with `ssh -G legacy-build`. These behaviors are documented in [ssh_config](https://man.openbsd.org/ssh_config#PubkeyAcceptedAlgorithms).

The option was renamed from `PubkeyAcceptedKeyTypes` in **OpenSSH 8.5**; the old spelling remains an alias. Older clients may require that spelling. Consult their installed manual instead of treating an unknown-option error as another negotiation failure. [OpenSSH 8.5 release notes](https://www.openssh.org/releasenotes.html#8.5) document the rename.

Only consider a separate, equally scoped `HostKeyAlgorithms +ssh-rsa` exception if host-key negotiation also fails. Preserve host verification and verify the server fingerprint through a trusted channel. A SHA-1 exception lowers protection and may still be blocked by platform cryptographic policy; schedule its removal with the server owner.

## Verify the exception is no longer needed

After remediation, remove the compatibility line and test the RSA identity with only SHA-2 user-authentication signatures:

```bash
ssh -vvv -S none -o IdentitiesOnly=yes \
  -o PubkeyAcceptedAlgorithms=rsa-sha2-512,rsa-sha2-256 \
  -i ~/.ssh/deploy_rsa deploy@legacy.example.com
```

This deliberate replacement tests a plain RSA key and excludes certificate algorithms. If the account requires an RSA SSH certificate, include `rsa-sha2-512-cert-v01@openssh.com` and `rsa-sha2-256-cert-v01@openssh.com` in the test allowlist and verify that certificate identity separately. For the plain-key test, confirm the intended fingerprint, `signing using rsa-sha2-512` or `rsa-sha2-256`, and successful public-key authentication; finish any required additional factors. A signing attempt followed by password fallback does not verify the fix. The [OpenSSH debug call](https://github.com/openssh/openssh-portable/blob/V_10_6_P2/sshconnect2.c#L1318) emits that signature choice at debug level three. Finally, retry the normal application workflow with its usual configuration and confirm access succeeds after removing the exception.
