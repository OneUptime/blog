# SSH Algorithm Negotiation: Fix Host Key, Cipher, and Key Exchange Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Security, Troubleshooting

Description: Diagnose SSH host-key, cipher, MAC, and key-exchange mismatches, inspect effective policy, and scope temporary compatibility exceptions to one destination.

An SSH connection can reach the correct server and still fail before it checks your login credentials. Messages such as `no matching host key type found` describe a transport negotiation failure. Changing your private key or adding unrelated compatibility flags can leave the original problem unresolved while weakening other connections.

## Identify the failing algorithm family

SSH negotiates several independent choices. Start with the exact error and its `Their offer:` list:

| Error fragment | Client setting | What needs agreement |
| --- | --- | --- |
| `no matching key exchange method found` | `KexAlgorithms` | How the peers establish session keys |
| `no matching host key type found` | `HostKeyAlgorithms` | How the server authenticates itself |
| `no matching cipher found` | `Ciphers` | Encryption for transported data |
| `no matching MAC found` | `MACs` | Separate message authentication, when required |

The [OpenSSH compatibility guide](https://www.openssh.org/legacy.html) separates these transport settings from later user authentication. `PubkeyAcceptedAlgorithms` concerns signatures for account authentication; adding it cannot repair a cipher mismatch. Conversely, `HostKeyAlgorithms` does not fix a later `sign_and_send_pubkey: no mutual signature supported` failure.

Authenticated-encryption ciphers provide integrity themselves. With one selected, OpenSSH can report `MAC: <implicit>` and skips separate MAC selection; that is not missing integrity protection. See the [OpenSSH negotiation implementation](https://raw.githubusercontent.com/openssh/openssh-portable/master/kex.c).

## Compare capabilities, configuration, and the peer's offer

These answer three different questions. First, identify the actual OpenSSH executable used by your terminal, IDE, or automation runner:

```bash
ssh -V
ssh -Q KexAlgorithms
ssh -Q HostKeyAlgorithms
ssh -Q Ciphers
ssh -Q MACs
```

[`ssh -Q`](https://man.openbsd.org/ssh#Q) reports algorithms implemented by that client. Seeing an algorithm here does not mean it is enabled for your destination, accepted by the server, or usable under every platform policy.

Next, evaluate the same alias, user, port, and options as the failing workflow:

```bash
ssh -G admin@legacy-storage |
  awk '$1 ~ /^(hostname|user|port|proxyjump|proxycommand|kexalgorithms|hostkeyalgorithms|ciphers|macs)$/ {print}'
```

[`-G`](https://man.openbsd.org/ssh#G) prints evaluated configuration and exits without an SSH connection. Use trusted configuration: evaluating [`Match exec`](https://man.openbsd.org/ssh_config#Match) can execute local commands. An unexpected hostname or old replacement allowlist may explain the failure immediately.

Then capture a fresh handshake against the intended endpoint:

```bash
ssh -vvv -S none admin@legacy-storage
```

This makes a real connection and may continue to login. [`-S none`](https://man.openbsd.org/ssh#S) prevents reuse of a multiplexed connection that would hide negotiation. Preserve required proxy and port options. With a jump host, identify which hop fails; destination options do not generally configure the jump host.

In verbose output, distinguish `local client KEXINIT proposal` from `peer server KEXINIT proposal`. Compare the failing family's lists, including both traffic directions for ciphers and MACs. The final `Their offer:` identifies the peer's proposal for that failure, not your local capabilities. Once negotiation succeeds, `kex:` lines show the selected algorithms. These labels come from [OpenSSH's negotiation code](https://raw.githubusercontent.com/openssh/openssh-portable/master/kex.c). Redact infrastructure details before sharing logs.

For example, if the peer offers `aes128-ctr`, `ssh -Q Ciphers` includes it, but `ssh -G` excludes it, investigate the client's configured cipher policy. If the peer offers no algorithm permitted locally, decide whether the server can enable a strong choice before considering an exception.

## Restore a strong overlap first

If both implementations support modern algorithms but custom policy removed the overlap, correct the relevant allowlist. Otherwise upgrade the outdated client, server, or appliance firmware. For host-key failures, the server must also have a usable host key for an allowed algorithm; editing a client's account key does not provision a server host key. See [`sshd_config` HostKey](https://man.openbsd.org/sshd_config#HostKey).

An RSA host key can use `rsa-sha2-256` or `rsa-sha2-512`. The `ssh-rsa` negotiation name means RSA with SHA-1, not every use of an RSA key. OpenSSH **8.8** disabled those SHA-1 signatures by default. A compatible server upgrade may therefore preserve the existing RSA host key. See the [8.8 release notes](https://www.openssh.org/releasenotes.html#8.8).

For server changes, an administrator can inspect effective configuration with `sshd -T` and validate it with `sshd -t`. Supply `-C` connection details when evaluating applicable `Match` rules, and retain a working administrative session while testing. These are [documented server test modes](https://man.openbsd.org/sshd#T).

## Keep a necessary exception narrow and temporary

Suppose diagnostics show **only** `ssh-rsa` offered for host authentication, local support exists, and the owner accepts a temporary SHA-1 exception during an upgrade window. Test just that setting:

```bash
ssh -vvv -S none -o HostKeyAlgorithms=+ssh-rsa admin@legacy-storage
```

For repeated access during that window, use one explicit alias in `~/.ssh/config`:

```sshconfig
Host legacy-storage
    HostName storage.example.net
    User admin
    # Temporary: storage owner must remove after firmware upgrade.
    HostKeyAlgorithms +ssh-rsa
```

The `+` appends to defaults; omitting it replaces the list. Place specific blocks before general defaults because the first obtained value normally wins, then inspect `ssh -G admin@legacy-storage` again. These rules are documented in [`ssh_config`](https://man.openbsd.org/ssh_config#HostKeyAlgorithms).

For a KEX, cipher, or MAC failure, apply the same reasoning to that family's setting and the exact offered algorithm. A second failure after the first is resolved needs its own diagnosis. Do not add a bundle of weak algorithms under `Host *` or a global automation setting. Record the exception's owner, expiry, and upgrade plan.

Preserve host verification. Confirm a new or changed fingerprint through an independently trusted channel before accepting it. An unauthenticated `ssh-keyscan` result alone does not establish the server's identity; its [manual explicitly describes that risk](https://man.openbsd.org/ssh-keyscan#DESCRIPTION).

## Recognize when a configuration exception cannot work

Disabled and removed are different states. OpenSSH **10.0** removed DSA support, so `HostKeyAlgorithms +ssh-dss` cannot restore it on those clients. Old compatibility examples may predate that removal. It also disabled finite-field Diffie-Hellman KEX in server defaults while leaving client defaults unchanged, reinforcing why both sides need inspection. See the [10.0 release notes](https://www.openssh.org/releasenotes.html#10.0).

A parser rejection such as an unsupported algorithm is local, before peer negotiation. Check spelling, the installed manual, and `ssh -Q` instead of adding more flags.

Platform policy also matters. On RHEL, inspect `update-crypto-policies --show`; FIPS and other policies can restrict available choices beyond assumptions based on upstream defaults. Coordinate remediation with the platform owner. Switching an entire system to `LEGACY` broadens exposure well beyond one destination, as [Red Hat documents](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening).

After remediation, remove the exception and make another fresh connection. Confirm strong negotiated choices, trusted host identity, successful authentication, and the original application workflow. A different error merely shows that troubleshooting has reached another stage.
