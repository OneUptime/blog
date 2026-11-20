# SSH Pseudo-Terminal Allocation: When to Use `-T`, `-t`, or `-tt`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Automation, Terminal, Troubleshooting

Description: Choose SSH terminal allocation deliberately, distinguish local stdin warnings from server refusals, and preserve command input, output, and exit status in automation.

A deployment job prints:

```text
Pseudo-terminal will not be allocated because stdin is not a terminal.
```

This is a local OpenSSH decision: a terminal was wanted, but the client's standard input cannot supply one. It does not establish whether authentication or the remote command succeeded. Adding `-tt` removes that particular obstacle by requesting a remote pseudo-terminal anyway; first determine whether your program needs one.

## Understand the four allocation modes

For an ordinary shell or command session, these are the relevant choices:

| Setting | Command-line choice | When OpenSSH requests a remote PTY |
| --- | --- | --- |
| `RequestTTY auto` | Default | A login session with no remote command, provided local stdin is a terminal |
| `RequestTTY no` | `-T` | Never |
| `RequestTTY yes` | `-t` | A shell or explicit command, provided local stdin is a terminal |
| `RequestTTY force` | `-tt` or `-t -t` | A shell or explicit command, even without a local terminal |

These settings are documented in [ssh_config(5)](https://man.openbsd.org/ssh_config#RequestTTY). A configured `RemoteCommand` also counts as a command; `-N` requests no session at all. This table assumes no conflicting options.

Consequently, `ssh host` normally requests a terminal from your terminal, while `ssh host 'id'` normally does not. A pipe, redirected file, here-document, or CI executor can make **stdin** nonterminal. Redirecting only stdout does not change stdin's terminal status. Setting `TERM=xterm` cannot turn a pipe into a terminal.

OpenSSH also treats `-n` as unavailable terminal input, even when the invoking shell has a terminal. `-f` implies `-n`. With either, a single `-t` can still print the warning and continue without a PTY; `-tt` overrides that allocation check but does not restore input. These details follow the [OpenSSH 10.3p1 client decision logic](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh.c).

## Use `-T` for ordinary automation

Choose an explicit remote command and disable terminal allocation when processing files, collecting machine-readable output, or running a deployment wrapper. The examples use a preconfigured `deploy-target` alias with verified host trust and credentials usable by the intended execution account.

This shell wrapper preserves SSH's exit status:

```sh
if ssh -nT -o BatchMode=yes -o StrictHostKeyChecking=yes \
    deploy-target 'id' >identity.txt 2>ssh-errors.log
then
    printf 'Remote command completed\n'
else
    status=$?
    printf 'SSH command failed: %s; inspect ssh-errors.log\n' "$status" >&2
    exit "$status"
fi
```

`-n` prevents SSH from consuming the wrapper's stdin; use it only when the remote command needs no input. Keep SSH in the foreground when the job must observe completion: `-f` backgrounds the client. SSH normally returns the remote command's status, or 255 for an SSH error. Read stderr to interpret 255 because a remote program can return it too. [SSH options and exit status](https://man.openbsd.org/ssh)

`BatchMode=yes` suppresses SSH authentication and host-confirmation interaction. It cannot answer a remote program's prompts, and `-T` does not make an interactive program suitable for unattended execution. Select that program's documented automation interface. [BatchMode](https://man.openbsd.org/ssh_config#BatchMode)

For a script supplied through stdin, omit `-n`:

```sh
ssh -T -o BatchMode=yes -o StrictHostKeyChecking=yes \
    deploy-target 'sh -s' <<'REMOTE'
cd /srv/app || exit 1
test -r VERSION || exit 1
exec cat VERSION
REMOTE
```

The quoted delimiter keeps the local shell from expanding the script. The explicit `sh -s` makes the remote interpreter clear; `exec` leaves the final command's status as the script's result. These constructs are described in [the dash shell manual](https://manpages.ubuntu.com/manpages/noble/man1/dash.1.html). A pipe supplying command data follows the same rule: `-T` preserves that input path; `-n` discards it. Programs inside a script read from the same stdin, so do not mix the script stream with an unrelated interactive dialogue.

## Allocate a PTY for a terminal-dependent program

For an operator using a local terminal, request one explicitly for a screen application:

```sh
ssh -t deploy-target 'top'
```

A job without terminal stdin needs `-tt` if an approved program truly requires a PTY. This finite diagnostic tests the remote standard descriptors without requesting any user input:

```sh
ssh -tt -o BatchMode=yes -o StrictHostKeyChecking=yes \
    deploy-target 'test -t 0 && test -t 1 && test -t 2' </dev/null
```

Forcing allocation supplies a remote terminal device, not a human, password, or valid sequence of answers. A program can still wait forever. Establish its input requirements, terminal type, and completion behavior before using it in a job. The distinction between single and repeated `-t` is documented in [ssh(1)](https://man.openbsd.org/ssh#t).

## A PTY changes the data path

Without a PTY, remote stdout and stderr remain separate SSH streams. With one, OpenSSH connects all three remote standard descriptors to the same terminal. Remote stderr therefore joins terminal output on the client's stdout; redirecting the client's stderr captures SSH diagnostics, not a separate remote error stream. See the [server's PTY setup](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/session.c).

Terminal modes can echo supplied input, buffer input by line, interpret control characters, and translate newlines into carriage-return/newline pairs. Applications can also switch to colors, progress displays, or different buffering when they detect a terminal. [Terminal line discipline](https://man.openbsd.org/termios.4)

Use `-T` for binary transfers and parsable output. Removing carriage returns afterward cannot restore separated streams or undo arbitrary terminal processing. A remote shell startup file that prints to stdout can still contaminate output without a PTY, so verify the complete command path.

## Distinguish a local warning from a server refusal

`PTY allocation request failed on channel 0` describes a different event: the server rejected an actual request. In OpenSSH 10.3p1, failure of an explicitly requested PTY (`yes` or `force`) closes the session; a default `auto` request can fail while the client continues without a terminal. A failure does not prove the remote command never started: the client sends the command request without first waiting for PTY confirmation. [Client request-confirmation handling](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/clientloop.c)

Inspect the applicable server [PermitTTY](https://man.openbsd.org/sshd_config#PermitTTY) policy and the matched key's [no-pty or restrict options](https://man.openbsd.org/sshd#AUTHORIZED_KEYS_FILE). Actual PTY allocation can also fail on the server. Repeating `-t` cannot override those restrictions.

A successful PTY request does not repair host trust, authentication, PAM policy, or a failing remote application. Preserve stderr and the final status instead of silencing the warning with `2>/dev/null` or masking failure with `|| true`. PTYs also change signal and hangup behavior: disconnecting may terminate terminal-bound processes, but it is not a reliable cancellation contract for every descendant. Give long-running jobs explicit lifecycle management and verify their result before retrying. [Terminal signals and disconnects](https://man.openbsd.org/termios.4)
