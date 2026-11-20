# SSH Too Many Authentication Failures: Select Keys with `IdentitiesOnly`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Authentication, Troubleshooting

Description: Diagnose SSH authentication failures caused by excess identities, limit agent offers with IdentitiesOnly, and catch additive IdentityFile configuration.

You have the right key, supply it with `ssh -i`, and still get disconnected with `Too many authentication failures`. The server may never have seen that key. An agent holding identities for several environments can supply enough rejected candidates to exhaust the connection's authentication budget first.

Start with this change, using your actual key, account, and destination:

```bash
ssh -o IdentitiesOnly=yes -i ~/.ssh/deploy_ed25519 deploy@web01.example.com
```

This excludes unrelated agent identities. Other configured identity files can still participate, so verify the effective configuration if the problem persists.

## Why `-i` does not make a key exclusive

The `-i` option supplies an identity file; multiple files are allowed. It does not disable identities supplied by the agent. OpenSSH's key-selection implementation can place unrelated agent keys before a key available only from a file. A matching configured key already held by the agent may be prioritized, which explains why the same command behaves differently across workstations. See the [identity option](https://man.openbsd.org/ssh#i) and [OpenSSH's key preparation code](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshconnect2.c#L1564).

The server's `MaxAuthTries` limits authentication attempts per connection; its documented default is six. Rejected public-key offers can consume that budget. A passphrase prompt is local key unlocking, so the absence of password prompts does not mean there were no authentication attempts. [OpenSSH server authentication limits](https://man.openbsd.org/sshd_config#MaxAuthTries) explain the server-side setting.

`IdentitiesOnly yes` limits selection to configured identities and certificates, including applicable defaults. It also filters additional identities from PKCS#11 or security-key providers. It does **not** disable the agent: the agent can still sign for a selected identity. [OpenSSH identity settings](https://man.openbsd.org/ssh_config#IdentitiesOnly) document this distinction.

## Inspect configuration before reconnecting

Use the same hostname or alias, username, and options as the failing command:

```bash
ssh -G -i ~/.ssh/deploy_ed25519 deploy@web01.example.com |
  awk '$1 ~ /^(hostname|user|port|identitiesonly|identityfile|certificatefile|identityagent|pkcs11provider|securitykeyprovider|proxyjump|proxycommand)$/ {print}'
```

[`ssh -G`](https://man.openbsd.org/ssh#G) evaluates configuration and exits without establishing an SSH connection. It does not list the agent's keys or prove that a key is readable or authorized. Configuration evaluation can still run existing `Match exec` commands; use a trusted configuration.

Look for `identitiesonly no`, unexpected `identityfile` entries, or an incorrect account. An alias and its underlying hostname can match different `Host` blocks. Examine relevant `Include` files too.

Inspect agent fingerprints separately:

```bash
ssh-add -l
ssh-keygen -lf ~/.ssh/deploy_ed25519.pub
```

[`ssh-add -l`](https://man.openbsd.org/ssh-add#l) lists fingerprints, allowing comparison without printing private keys. It queries the agent selected by `SSH_AUTH_SOCK`; a host-specific `IdentityAgent` may point SSH elsewhere. An empty or unavailable agent does not prevent authentication using a readable private key file.

## Make the fix specific to the destination

Add a block near the beginning of `~/.ssh/config`, ahead of general defaults:

```sshconfig
Host prod-web
    HostName web01.example.com
    User deploy
    IdentityFile ~/.ssh/deploy_ed25519
    IdentitiesOnly yes
```

Then inspect and connect through that alias:

```bash
ssh -G prod-web | awk '$1 ~ /^(user|hostname|identityfile|identitiesonly)$/ {print}'
ssh prod-web
```

For ordinary scalar settings, the first obtained value wins: command-line options precede user configuration, then system configuration. An earlier matching `IdentitiesOnly no` can therefore defeat a later `yes`. Keep specific blocks before broad defaults. [OpenSSH's configuration parser](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/readconf.c#L57) describes that ordering.

`IdentityFile` is an exception: entries accumulate. Consider this complete miniature configuration:

```sshconfig
Host prod-web
    HostName web01.example.com
    User deploy
    IdentityFile ~/.ssh/deploy_ed25519
    IdentitiesOnly yes

Host *
    IdentityFile ~/.ssh/personal_ed25519
```

Both files are candidates for `prod-web`. Moving the wildcard block down does not remove its identity. Narrow the personal key's matching hosts, or deliberately exclude the alias from that block:

```sshconfig
Host * !prod-web
    IdentityFile ~/.ssh/personal_ed25519
```

Check every matching block, including included files. Adding `-i` also does not erase existing entries, and `IdentityFile none` is not a reset of previously accumulated paths. The [identity-file parser](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/readconf.c#L1332) appends each applicable entry.

## Verify the identities actually offered

When ready to make a connection, request debug output and avoid reusing an authenticated multiplexed session:

```bash
ssh -vv -S none prod-web
```

[`-S none`](https://man.openbsd.org/ssh#S) disables connection sharing for this invocation. In the debug output, distinguish the candidate list (`Will attempt key`) from attempted offers (`Offering public key`). If the public key was not loaded in advance, OpenSSH can instead log `Trying private key` before loading and signing with it; follow the subsequent signing and server-response messages. Compare fingerprints with the intended public key. A `Too many authentication failures` disconnect after unrelated offers points to identity selection; an offer of the intended key followed by rejection points elsewhere.

`Server accepts key` is not the final success signal: signing or another required authentication factor can still fail. Look for completed authentication. Keep diagnostic output private or redact hostnames, accounts, paths, and fingerprints before sharing it.

For a directly reachable host, isolate file-based configuration with an explicit destination:

```bash
ssh -vv -F /dev/null -o IdentitiesOnly=yes \
  -i ~/.ssh/deploy_ed25519 deploy@web01.example.com
```

[`-F`](https://man.openbsd.org/ssh#F) replaces the user configuration and suppresses the system configuration. This also removes configured ports, proxies, and host-key settings; supply required settings explicitly. Preserve host verification. If this succeeds while the alias fails, compare the configurations.

## Account for certificates and other failure modes

A configured identity may have an automatically discovered sibling certificate such as `deploy_ed25519-cert.pub`, or an explicit `CertificateFile`. `IdentitiesOnly` allows configured certificates too. For agent-only keys, `IdentityFile` can reference the matching public-key file. `IdentityAgent none` disables agent access and is unsuitable when that agent is your only signer. See the [identity and certificate configuration](https://man.openbsd.org/ssh_config#IdentityFile).

Once the intended identity is offered, check the destination account, authorized keys or certificate principals, signing access, and server logs through an authorized administrative path. Key selection does not grant access or satisfy additional factors required by [`AuthenticationMethods`](https://man.openbsd.org/sshd_config#AuthenticationMethods).

Avoid raising `MaxAuthTries` to accommodate unrelated keys. Connection throttling is a separate investigation: `MaxStartups` limits concurrent unauthenticated connections, while `PerSourcePenalties`, introduced in [OpenSSH 9.8](https://www.openssh.org/releasenotes.html#9.8), can temporarily refuse connections from a source. An earlier disconnect, network timeout, or ban requires examining that layer. Use the actual failure stage and server logs instead of repeatedly retrying.
