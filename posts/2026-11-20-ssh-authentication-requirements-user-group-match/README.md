# How to Apply Different SSH Authentication Requirements by User and Group with `Match` Blocks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Authentication, Linux, Security

Description: Build per-user and per-group SSH authentication policies with Match blocks, understand overlapping rules, and verify required authentication paths before rollout.

A shared server may require interactive authentication for people while accepting keys for unattended jobs. OpenSSH can express these requirements in one daemon configuration, but overlapping `Match` blocks make ordering part of the policy.

This example targets portable OpenSSH on Linux with PAM support. Assume the accounts, authorized keys, and human authentication backend already work. Keep an existing administrative session and a recovery console available while changing authentication.

## Define complete authentication paths

`AuthenticationMethods` describes the methods needed to finish authentication. Commas join required steps in order; spaces separate alternative complete paths. Each referenced method must also be enabled. [OpenSSH's authentication-method documentation](https://man.openbsd.org/sshd_config#AuthenticationMethods) defines these combinations:

| Configuration value | Requirement |
| --- | --- |
| `publickey` | One accepted public key |
| `publickey,keyboard-interactive:pam` | A key, followed by successful PAM keyboard-interactive authentication |
| `publickey,publickey` | Two distinct accepted public keys |
| `publickey keyboard-interactive:pam` | Either a key or PAM keyboard-interactive authentication |

That last space creates an alternative route; it does not require two steps. Repeating `publickey` requires different keys, but two keys do not inherently represent independent authentication factors.

PAM keyboard-interactive is an interface, not a guarantee of MFA. Its actual requirements come from the PAM service configuration. For example, an OTP module's enrollment exemptions can undermine the intended requirement; Google Authenticator documents that `nullok` permits operation without an enrolled secret. Review the complete PAM stack and test unenrolled accounts before calling the policy MFA. [Google Authenticator PAM documentation](https://github.com/google/google-authenticator-libpam#setting-up-the-pam-module-for-your-system)

## Put explicit exceptions before broader matches

Here is one concrete policy: human accounts require a key and PAM authentication; members of `ssh-automation` require one key; the named `release-bot` account requires two keys, even when it belongs to that group.

Merge the global settings into the global section of `/etc/ssh/sshd_config`, before any `Match` block. Place the conditional rules after the global settings and before any overlapping conditional rules that should have lower priority:

```text
# Global settings
UsePAM yes
UseDNS no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication yes
AuthenticationMethods publickey,keyboard-interactive:pam

# Named-account policy takes priority over the group policy below.
Match User release-bot
    AuthenticationMethods publickey,publickey
    KbdInteractiveAuthentication no

Match Group ssh-automation
    AuthenticationMethods publickey
    KbdInteractiveAuthentication no
```

`PasswordAuthentication no` disables the SSH password method; PAM keyboard-interactive can still request a password. With `UsePAM yes`, PAM account and session checks also apply to successful public-key logins, including the automation exceptions. [Portable OpenSSH PAM semantics](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd_config.5)

Matching blocks override global values. When several matching blocks set the same option, the first applicable assignment wins **for that option**. A later matching block can still supply a different option that earlier blocks did not set. There is no automatic preference for a username over a group: reversing these two blocks would reduce `release-bot` to one key. [Match evaluation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/servconf.c)

Treat membership in `ssh-automation` as an authentication exemption. A human accidentally added to it receives the group policy. Authentication requirements also do not replace your existing login allowlists or restrictions on what service accounts may execute.

## Keep conditional scope visible

All criteria on one line must match. For example, `Match User release-bot Group ssh-automation` requires both conditions. Comma-separated positive patterns within one criterion provide alternatives; negated patterns exclude matches. Group matching uses account and group information resolved on the server; a client cannot choose its group. [OpenSSH matching implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/servconf.c)

A block continues until the next `Match` or the end of its file. Indentation does not close it. `Match all` matches everyone, but does not overwrite earlier matching assignments. Keep `UsePAM`, `UseDNS`, `Port`, and `ListenAddress` before the conditional sections; they cannot be scoped to individual users or groups. Authentication settings shown inside the example blocks are permitted there. Check the target version's allowed-keyword list before adding others. [Supported Match directives](https://man.openbsd.org/sshd_config#Match)

Included files participate at their `Include` location, and wildcard filenames are processed lexically. Inspect the complete include chain before installing a snippet: consider enclosing conditions and earlier matching assignments, not just the new filename. [Include processing](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd_config.5)

## Inspect every policy class on the target server

First validate the complete configuration, including its host keys:

```bash
sudo /usr/sbin/sshd -t -f /etc/ssh/sshd_config
```

Then evaluate representative connections using `-T -C`. These are configuration inspections, not login attempts. Substitute real accounts and the source and destination addresses that the daemon will see:

```bash
id release-bot
id backup-bot
id alice

sudo /usr/sbin/sshd -T -f /etc/ssh/sshd_config \
  -C 'user=release-bot,addr=198.51.100.25,host=198.51.100.25,laddr=192.0.2.10,lport=22'
```

Repeat the command for each account and compare `authenticationmethods`, `pubkeyauthentication`, `passwordauthentication`, `kbdinteractiveauthentication`, and `usepam`. The supported connection attributes do not include `group=`. Group tests require an existing account whose memberships resolve on that server. [sshd test parameters](https://man.openbsd.org/sshd#C)

| Representative account | Membership | Expected `authenticationmethods` |
| --- | --- | --- |
| `release-bot` | `ssh-automation` | `publickey,publickey` |
| `backup-bot` | `ssh-automation` | `publickey` |
| `alice` | Outside `ssh-automation` | `publickey,keyboard-interactive:pam` |

The example explicitly uses `UseDNS no`, so `host` is the numeric source address. `-C` accepts the supplied hostname literally; it does not derive it from `addr`. For deployments using `UseDNS yes` and hostname conditions, supply the daemon's verified source hostname, or its numeric fallback. [Connection attribute construction](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/monitor_wrap.c), [DNS verification and fallback](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/packet.c)

## Verify rejection as well as success

A configuration dump does not prove credentials or PAM work. OpenSSH rejects authentication paths containing disabled methods; if none remain, authentication cannot complete. Startup checks catch some impossible combinations, but conditional combinations still require inspection and login tests. [Startup validation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshd.c), [authentication-path validation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/auth2.c)

After validation, reload the SSH service using your distribution's service procedure. Test new connections with `ssh -vv -S none user@server.example.com`; `-S none` disables connection sharing so an authenticated master cannot bypass the new handshake. [SSH command options](https://man.openbsd.org/ssh#S)

For `alice`, a key alone and PAM alone must fail, while the complete intended sequence succeeds. For `backup-bot`, one authorized key should suffice. For `release-bot`, one key must fail and two distinct authorized keys must succeed. For controlled identity tests, use a dedicated `-F` configuration with `IdentitiesOnly yes` and inspect its `ssh -G` output. This still permits every configured `IdentityFile` and `CertificateFile`, so hidden entries could satisfy the second key step. Include only the intended existing identities and certificates plus required routing and trust settings. Restrict `PreferredAuthentications` to test individual routes. [Client authentication controls](https://man.openbsd.org/ssh_config#IdentitiesOnly)

Confirm the server logs agree with each outcome before closing your recovery session. Repeat the matrix whenever group membership, include ordering, or PAM policy changes.
