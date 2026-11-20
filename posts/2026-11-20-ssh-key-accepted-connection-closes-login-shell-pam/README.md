# SSH Key Accepted, Then Connection Closes: Shell, PAM, and ForceCommand

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Linux, PAM, Troubleshooting

Description: Diagnose SSH connections that close after key acceptance by separating authentication, account policy, forced commands, shell startup, and home-directory failures.

An SSH key can be valid while the requested session is unavailable. The useful question is how far the connection progressed: did the client sign successfully, complete every authentication requirement, open a session, and start the expected program?

These examples target Ubuntu 24.04 LTS with its OpenSSH 9.6p1 package family. Run server inspections through an existing authorized administrative session or console with the necessary read permissions. Keep that access open throughout recovery.

## Establish whether authentication actually finished

Read the existing client transcript before retrying. A connection using a restricted key can start a backup or deployment wrapper, even when you intended only to diagnose SSH. Once you have checked that reconnecting is appropriate, reproduce the original destination, username, key, port, and jump-host route:

```bash
ssh -vvv -o ControlMaster=no -o ControlPath=none \
  -o IdentitiesOnly=yes -i ~/.ssh/alice_ed25519 \
  alice@server.example.net
```

Disabling connection sharing makes this attempt perform its own authentication. Keep host-key verification enabled and retain any required MFA prompts. These client settings are documented in [ssh_config(5)](https://manpages.ubuntu.com/manpages/noble/man5/ssh_config.5.html).

Interpret the messages in order:

| Client evidence | Meaning |
|---|---|
| `Server accepts key` | The server accepted the public-key offer; signing still follows. |
| `Authenticated using "publickey" with partial success` | One authentication step succeeded; more are required. |
| `Authenticated to ... using "publickey"` | Authentication completed. Investigate subsequent session requests and termination. |

The distinction comes directly from [OpenSSH's client authentication code](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/sshconnect2.c). A signature failure after the first message still belongs to authentication. With `AuthenticationMethods publickey,keyboard-interactive`, the key alone is insufficient; follow the remaining challenge instead of disabling it. See [AuthenticationMethods](https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html).

## Match the attempt to server evidence

Record the attempt's time and timezone, destination, username, and source address as seen by the server. Through the existing administrative session, inspect a narrow window:

```bash
journalctl -u ssh.service --since '10 minutes ago' \
  --no-pager -o short-iso-precise
```

Use the actual attempt window; [journalctl](https://manpages.ubuntu.com/manpages/noble/man1/journalctl.1.html) also accepts explicit start and end times. If the unit filter misses records, inspect the system journal or configured authentication log, such as `/var/log/auth.log` when present.

Correlate source port and sshd process ID where available. Look before the disconnect for account denials, failed session setup, execution errors, or an intentional program exit. A PAM session-open/session-close pair alone does not establish that PAM caused the closure. Redact identities and internal addresses before sharing transcripts.

## Inspect the policy that actually applies

Evaluate the real connection's `Match` conditions, rather than reading one configuration line:

```bash
/usr/sbin/sshd -T -f /etc/ssh/sshd_config \
  -C user=alice,addr=198.51.100.27,host=198.51.100.27,laddr=192.0.2.10,lport=22
```

Replace every example value; `addr` is the source address seen by sshd. With the default [`UseDNS no`](https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html), set `host` to that numeric address as shown. With `UseDNS yes`, use the source hostname only when sshd's [reverse lookup and forward-address verification](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_6_P1/auth.c) succeed; otherwise use the numeric address. The [test-mode parser](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_6_P1/servconf.c) uses the supplied `host` directly, so it must match what the running daemon would derive. Reproduce any configuration path and command-line overrides used by the running service. The [sshd test mode](https://manpages.ubuntu.com/manpages/noble/man8/sshd.8.html) prints effective settings and exits; it does not test PAM or execute a login.

Inspect `authenticationmethods`, `usepam`, `forcecommand`, `chrootdirectory`, `permittty`, and authorized-key locations. Follow included files when locating the responsible rule.

`ForceCommand` replaces the requested shell, command, or subsystem. A non-SFTP forced command runs through the user's shell with `-c`; `internal-sftp` uses the built-in server. An SFTP-only account rejecting a shell can therefore be working correctly. See [ForceCommand](https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html).

Also inspect the **matched key's** options in the effective authorized-key source. `command="..."` can select a wrapper even when `forcecommand` is `none`; a server `ForceCommand` can supersede it. Certificate restrictions may matter too. `no-pty` denies terminal allocation, not authentication. These are separate from the configuration dump; see [authorized_keys options](https://manpages.ubuntu.com/manpages/noble/man8/sshd.8.html).

Inspect a wrapper's code and logs before rerunning it. A wrapper that finishes immediately naturally ends the session.

## Check the resolved shell and startup files

Ask the system's [Name Service Switch](https://manpages.ubuntu.com/manpages/noble/man1/getent.1.html) for the account, including directory-backed identities:

```bash
getent passwd alice
# Inspect the actual shell and home paths returned above:
namei -l /bin/bash
namei -l /home/alice
```

[namei](https://manpages.ubuntu.com/manpages/noble/man1/namei.1.html) exposes ownership, modes, and symlinks along each path. Check executable access for the target user, not merely the administrator.

A missing shell or one with no execute bits normally triggers OpenSSH's account eligibility checks before authentication, unless chroot handling changes that path. Some execute bits being set does not guarantee the target user can execute the shell; that permission failure can occur later. Do not misclassify an early eligibility denial as a successfully started shell. See [OpenSSH's account checks](https://github.com/openssh/openssh-portable/blob/V_9_6_P1/auth.c). An executable [nologin](https://manpages.ubuntu.com/manpages/noble/man8/nologin.8.html), however, deliberately prints a refusal and exits. Preserve this restriction on service accounts.

For Bash, inspect `/etc/profile` and the first readable file among `.bash_profile`, `.bash_login`, and `.profile`. Follow their sourced files. Bash may also read `.bashrc` during noninteractive SSH execution, so a remote command is not a guaranteed startup-file bypass. See [Bash invocation rules](https://manpages.ubuntu.com/manpages/noble/man1/bash.1.html).

Look for an unintended `exit`, an `exec` replacing the shell with a short-lived process, or a failed command combined with `set -e`. Inspect applicable `.ssh/rc` and `/etc/ssh/sshrc` hooks too. Correct the specific failing startup statement; avoid replacing the entire profile.

## Trace PAM account and session failures separately

With `UsePAM yes`, public-key logins still undergo PAM account and session processing. Account denial can prevent authentication completion; session setup can fail afterward. See [UsePAM](https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html) and OpenSSH's [account-check sequence](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_6_P1/auth2.c).

```bash
cat /etc/pam.d/sshd
cat /etc/pam.d/common-account
cat /etc/pam.d/common-session
```

Follow the actual includes and control flags. A required module failure can determine the result even when later modules succeed; [PAM configuration semantics](https://manpages.ubuntu.com/manpages/noble/man5/pam.conf.5.html) explain the distinction.

Investigate the module named in the logs: [pam_unix](https://manpages.ubuntu.com/manpages/noble/man8/pam_unix.8.html) checks account/password expiry; [pam_nologin](https://manpages.ubuntu.com/manpages/noble/man8/pam_nologin.8.html) enforces maintenance lockouts; [pam_limits](https://github.com/linux-pam/linux-pam/blob/v1.5.3/modules/pam_limits/pam_limits.8.xml) can fail session setup. Restore the intended account state or repair that module's specific dependency. Disabling PAM bypasses policy and hides the cause.

## Treat home and chroot failures precisely

A missing home does **not** universally terminate SSH: OpenSSH's [session implementation](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_6_P1/session.c) can report a failed directory change and continue. Determine whether a required PAM module, startup script, unavailable mount, or actual execution error makes this case fatal. Repair the resolved path or mount; do not recursively rewrite home-directory permissions.

With `ChrootDirectory`, every path component must be root-owned and not writable by other users or groups. Interpret home and executable paths inside that jail; an interactive shell also needs its runtime dependencies there. The [chroot requirements](https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html) differ from ordinary home ownership.

After a scoped repair, validate any sshd configuration change with `sshd -t` before applying it through your normal change process. Then verify the intended shell, command, or SFTP operation using a fresh connection and matching server records. A completed key exchange or accepted key is only an intermediate checkpoint.
