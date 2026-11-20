# SSH Agent Forwarding Breaks After `sudo`, `su`, or `tmux`: Follow the `SSH_AUTH_SOCK`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Agent Forwarding, Linux, Sudo, Tmux, Troubleshooting

Description: Diagnose SSH agent forwarding failures across sudo, su, and tmux by checking the process environment, socket access, and connection lifetime.

A Git operation works immediately after SSH login, then fails after `sudo`, `su`, or reattaching to tmux. Before loading another key, compare the working and failing execution contexts. The useful evidence is the effective user, the value of `SSH_AUTH_SOCK`, and whether that socket still reaches the intended agent.

## Follow the connection, not the filename

Your workstation's agent holds identities and answers signing requests. Agent forwarding creates a remote endpoint that carries requests back through SSH; it does not copy your private key to the server. `SSH_AUTH_SOCK` on the remote host identifies that remote endpoint, not the workstation's filesystem path. [OpenSSH agent documentation](https://man.openbsd.org/ssh-agent)

OpenSSH creates the forwarded listener under the authenticated user's identity and cleans it up with the connection. A tmux shell can survive the SSH transport that provided its socket. A pathname left in that shell cannot resurrect the connection. [OpenSSH forwarding implementation](https://github.com/openssh/openssh-portable/blob/master/session.c)

Multiplexed SSH transports can also outlive an individual login shell, so “I closed a terminal” is not a precise lifetime test. [ControlPersist documentation](https://man.openbsd.org/ssh_config#ControlPersist)

Do not start a new agent on the remote host as the first repair. That changes which agent the shell uses; a new empty agent does not recover the forwarded identities.

## Capture the boundary where it breaks

Run this in the working remote shell, then in the failing shell. These commands use Bourne-style shell syntax:

```sh
id
printf 'SSH_AUTH_SOCK=%s\n' "${SSH_AUTH_SOCK-<unset>}"
if [ -n "${SSH_AUTH_SOCK-}" ]; then
    ls -ld -- "$(dirname -- "$SSH_AUTH_SOCK")" "$SSH_AUTH_SOCK"
    if [ -S "$SSH_AUTH_SOCK" ]; then
        printf 'Socket exists\n'
    fi
fi
ssh-add -l
agent_status=$?
printf 'ssh-add exit status=%s\n' "$agent_status"
```

Interpret the results separately:

| Observation | Next check |
| --- | --- |
| Variable absent or empty | Environment filtering, login initialization, or shell startup files |
| Path missing or not a socket | Stale environment or a forwarding connection that ended |
| Socket exists but connection fails | Directory traversal permissions, socket access, listener lifetime, or security policy |
| Agent responds with no identities | The selected agent has no available identities; compare with the original workstation |
| Expected fingerprints appear | Socket access works; investigate signing restrictions, SSH identity selection, or destination authorization |

`ssh-add -l` lists fingerprints. OpenSSH documents exit status 2 when the agent cannot be contacted; status 1 is a command failure, so read the accompanying message. A successful filesystem test alone does not prove that a listener responds. Listing keys does not test signing: confirmation requirements or destination constraints can still prevent authentication. [ssh-add manual](https://man.openbsd.org/ssh-add)

On Linux, `namei -l "$SSH_AUTH_SOCK"` can expose inaccessible parent directories. Compare numeric identities from `id`, not just `$USER`, which is another environment variable. Avoid dumping the entire environment into a ticket.

## `sudo`: policy and identity both matter

The behavior described here is documented for **sudo 1.9.17p2 with the sudoers policy**. Check `sudo -V`, `sudo --help`, and the applicable rules with `sudo -l` on your host. With `env_reset` enabled, sudo constructs a reduced environment and selectively retains variables through policy lists such as `env_keep`. An absent `SSH_AUTH_SOCK` is therefore plausible, but not universal. `sudo -i` initializes the environment even when `env_reset` is disabled. [sudoers 1.9.17p2 manual](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/sudoers.man.in)

Prefer running the network operation as the original login user and elevating only the local installation step. If an approved command genuinely needs the forwarded agent, sudo supports a request to retain just this variable:

```sh
# Only for an authorized target identity and permitted command.
sudo --preserve-env=SSH_AUTH_SOCK -u targetuser ssh-add -l
```

Replace `targetuser` with the intended account. Policy can reject preservation or the command itself. A permanent exception belongs in a narrowly scoped administrator-managed sudoers rule. Do not disable `env_reset` or apply blanket `sudo -E` as a troubleshooting shortcut. [sudo 1.9.17p2 options](https://github.com/sudo-project/sudo/blob/v1.9.17p2/docs/sudo.man.in)

Preserving the string does not grant the new user permission to traverse its directory or connect to the socket. Conversely, root's ability to access an agent is a security exposure, not evidence that every sudo invocation preserves its location. Keep socket protections intact; do not use `chmod 777` or share the endpoint indiscriminately. [OpenSSH socket access caveats](https://man.openbsd.org/ssh-agent#ENVIRONMENT)

## `su`: identify the implementation

For **util-linux `su`**, ordinary `su` retains much of the caller's environment, whereas `su --login` clears most variables. Its `--whitelist-environment` option can retain selected variables during login initialization, but PAM performs additional environment changes afterward. `--preserve-environment` preserves the whole environment and is ignored with `--login`. Other implementations differ. Check `su --version` and the installed manual before relying on these semantics. [util-linux su documentation](https://github.com/util-linux/util-linux/blob/master/login-utils/su.1.adoc)

After switching users, repeat the boundary checks. If the workflow belongs to the original SSH identity, exit the substitute shell. If another account needs independent access, establish that account's approved authentication workflow. Copying the old pathname into its environment cannot solve a user or permission mismatch.

## `tmux`: refresh the session and the shell

Tmux keeps global and session environments; new processes inherit their merged values. `update-environment` copies selected variables from an attaching client, but `attach -E` skips that update. An absent client variable in that list is marked for removal. Existing shells keep their previously inherited values. [tmux environment manual](https://man.openbsd.org/tmux#GLOBAL_AND_SESSION_ENVIRONMENT)

From a fresh, working SSH shell **outside tmux**, inspect the intended session:

```sh
tmux show-options -A -t work update-environment
tmux show-environment -t work SSH_AUTH_SOCK
```

Ensure `SSH_AUTH_SOCK` is included in the effective `update-environment` list. For a deliberate one-session refresh from that verified shell:

```sh
test -S "${SSH_AUTH_SOCK-}" &&
    tmux set-environment -t work SSH_AUTH_SOCK "$SSH_AUTH_SOCK" &&
    tmux attach-session -t work
```

If either check or update fails, attachment is skipped; resolve that failure first. After attaching, create a new window and repeat the checks. For an existing shell, copy the verified current path explicitly:

```sh
export SSH_AUTH_SOCK='/replace/with/verified/current/socket'
ssh-add -l
```

Do not select the first socket found under `/tmp`. Multiple attached clients may supply different agents; choose the intended connection. If it disconnects, refresh again. Updating the session environment is not a permanent forwarding service.

After recovery, verify the expected fingerprints in the exact user and shell that runs the failing command. Keep the supplying SSH connection active, then retry the operation. If listing succeeds but authentication still fails, continue with signing restrictions, identity selection, and destination permissions.
