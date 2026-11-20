# Remote `sudo` Says “a Terminal Is Required”: Allocate a PTY or Change the Command Path?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Sudo, Linux, Troubleshooting

Description: Separate sudo password prompts, requiretty policy, and application terminal needs, then choose an interactive SSH session or a narrowly authorized unattended command.

An SSH login succeeds, but `ssh host 'sudo command'` fails before the command runs. Adding `-tt` may change the error without making the operation suitable for automation. First identify which layer needs a terminal, then decide who will supply any required interaction.

The sudo behavior below is scoped to **sudo 1.9.17p2 with the sudoers policy**. Check `sudo -V` and the installed manual on the destination; distribution defaults and other policy plugins can differ.

## Identify the terminal requirement

These similar-looking situations need different responses:

| Observation | Meaning | Next action |
| --- | --- | --- |
| `a terminal is required to read the password` | Sudo needs authentication but cannot open its normal terminal input | Provide an operator terminal or redesign unattended authorization |
| `sorry, you must have a tty to run sudo` | The applicable `requiretty` policy rejected this execution context | Inspect policy with the administrator |
| The elevated program starts, then complains about a terminal | The application has its own terminal dependency | Select its batch interface or intentionally provide a PTY |

The first error comes from sudo's [password-reading implementation](https://github.com/sudo-project/sudo/blob/v1.9.17p2/src/tgetpass.c), which normally opens `/dev/tty`; it concerns password input. The [sudoers policy implementation](https://github.com/sudo-project/sudo/blob/v1.9.17p2/plugins/sudoers/sudoers.c) checks `requiretty` separately, before password authentication. A passwordless rule therefore does not override `requiretty`.

Also distinguish **`use_pty`**: it runs an authorized command in another pseudo-terminal when sudo already has a terminal. It does nothing when sudo is unattached to one. Enabled by default since sudo 1.9.14, it cannot supply the missing SSH terminal or repair password input. `requiretty`, by contrast, is off in upstream defaults. Keep existing protections while investigating. [Sudoers terminal settings](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/sudoers.man.in)

## Give an operator a terminal

For a human at a local terminal, request a remote PTY:

```sh
ssh -t deploy-target 'sudo -u root /usr/local/sbin/app-maintenance-status'
```

Here `deploy-target` is an existing SSH alias with verified host trust, and the example wrapper is defined below. Substitute an already authorized command when diagnosing an existing system. An explicit remote command normally does not receive a PTY automatically. Repeated `-t`, as in `-tt`, forces the request even without terminal stdin. It supplies a terminal device, not a password or an operator. [OpenSSH terminal options](https://man.openbsd.org/ssh#t)

If SSH reports that PTY allocation failed, inspect the effective [PermitTTY setting](https://man.openbsd.org/sshd_config#PermitTTY) and the matched key's [no-pty or restrict options](https://man.openbsd.org/sshd#AUTHORIZED_KEYS_FILE). Repeating the option cannot override server policy.

Do not use a forced terminal merely to conceal an unattended password prompt. Do not pipe passwords into `sudo -S` as a troubleshooting shortcut. If an interactive application is the actual dependency, check its documented noninteractive mode before carrying terminal behavior into a job.

## Make unattended execution fail without prompting

Use two distinct controls: SSH's `BatchMode=yes` suppresses SSH authentication and host-confirmation interaction; remote `sudo -n` refuses to prompt when sudo needs input. Neither guarantees that the eventual application terminates. [SSH BatchMode](https://man.openbsd.org/ssh_config#BatchMode), [sudo options](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/sudo.man.in)

After the administrator provisions the example capability:

```sh
if ssh -nT -o BatchMode=yes -o StrictHostKeyChecking=yes \
    deploy-target \
    'sudo -n -u root /usr/local/sbin/app-maintenance-status'
then
    printf 'Status read completed\n'
else
    status=$?
    printf 'Remote status read failed: %s\n' "$status" >&2
    exit "$status"
fi
```

`-T` disables PTY allocation; SSH's `-n` redirects stdin from `/dev/null`, suitable here because the wrapper takes no input. Preserve stderr and the exit status. A failed invocation could indicate authentication, authorization, a missing file, or command failure; inspect the message before changing policy. [SSH invocation and exit status](https://man.openbsd.org/ssh)

## Authorize a small command surface

Prefer running ordinary work as the login user and elevating only the necessary operation. For illustration, suppose `deploy` must read one administrator-maintained, nonsecret status file. If direct read permission meets the requirement, use that instead. Otherwise, this fixed wrapper limits the intended capability to reading that file:

```sh
#!/bin/sh
set -eu
if [ "$#" -ne 0 ]; then
    printf 'This command takes no arguments\n' >&2
    exit 2
fi
cd /
exec /usr/bin/cat -- /var/lib/acme/maintenance-state
```

An administrator installs it at `/usr/local/sbin/app-maintenance-status`, owned by `root:root` with mode `0755`. The status file must be a small regular file owned by root, mode `0600`, with approved contents. Verify the wrapper, interpreter, executable, input file, and all parent directories cannot be replaced or modified by `deploy`, including through groups, ACLs, symlinks, or other sudo grants. Root ownership alone is insufficient if a parent directory is writable.

The corresponding rule for the actual host `app01` is:

```sudoers
deploy app01=(root) NOPASSWD: /usr/local/sbin/app-maintenance-status ""
```

Replace the account and host deliberately. The trailing `""` means **no arguments**; omitting arguments from a sudoers entry permits arbitrary arguments. For a command that needs arguments, specify the exact allowed command line. Avoid broad argument wildcards. [Sudoers command matching](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/sudoers.man.in)

This rule is only one part of the authorization design. Keep `env_reset` and logging enabled, review preserved environment variables and overlapping grants, and do not allow `SETENV` for this wrapper. Environment filtering must prevent caller-controlled shell functions or interpreter startup settings from reaching the privileged shell. Do not expand the grant to a general shell, interpreter, editor, or user-writable deployment script. Changing the wrapper to restart services or consume configuration requires reviewing those new privileges and inputs again.

If `requiretty` is enforced, the administrator must decide whether this dedicated automation identity may run without it. Use an approved scoped exception or an execution service consistent with that policy; do not disable the control globally to make a job pass.

## Validate policy and test without cached credentials

Keep a working administrator recovery session open. Confirm the policy actually includes `/etc/sudoers.d`, then have the administrator edit the drop-in with `visudo -f /etc/sudoers.d/60-deploy-status`. A staged candidate can first be checked with `visudo -c -f /path/to/candidate`; always run `visudo -c` against the complete installed policy afterward. A successful fragment check cannot establish consistency across includes, and syntax validation cannot prove the wrapper is safe. [Visudo validation](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/visudo.man.in)

Have the administrator inspect effective privileges with `sudo -ll -U deploy`. Successful `sudo -n` execution alone does **not** prove a `NOPASSWD` rule matched: cached authentication may have satisfied the password requirement. Cache records can be scoped to terminals, parent processes, or globally per user, so a different SSH session can behave differently. [Sudo timestamp records](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/sudoers_timestamp.man.in)

For this approved read-only wrapper, test as the actual automation account:

```sh
ssh -nT -o BatchMode=yes -o StrictHostKeyChecking=yes \
    deploy-target \
    'sudo -k -n -u root /usr/local/sbin/app-maintenance-status'
```

With a command, `-k` ignores cached credentials for that invocation. This **executes** the wrapper; it is not a dry run. Pair the result with policy inspection, and verify that extra arguments and unintended commands are denied in a controlled test environment. [Sudo cache and listing options](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/sudo.man.in)

The repair is complete when the intended identity can run exactly the approved operation, without unexpected prompts, and failures reach the job's caller with useful diagnostics.
