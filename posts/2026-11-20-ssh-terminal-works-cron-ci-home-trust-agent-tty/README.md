# SSH Works in Your Terminal but Fails in Cron or CI: Recreate `HOME`, Host Trust, Agent, and TTY State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Cron, CI/CD, Troubleshooting

Description: Reproduce SSH failures in cron and CI by making execution identity, home lookup, trusted hosts, credentials, terminal state, and time limits explicit.

Your terminal's successful connection depends on more than its command line. The scheduled process may run as another account, lack your agent, miss a host alias, or have nobody available to answer a prompt. Compare those dependencies before changing server authentication policy.

The examples target Linux with Bash, OpenSSH, and GNU coreutils. Cron details below refer to Cronie; other cron implementations and CI executors can initialize jobs differently.

## Observe the actual job

Run this small diagnostic inside the failing job and your working terminal. Keep the output private; even paths and account names can be sensitive.

```bash
id
pwd
printf 'HOME=%s\nPATH=%s\n' "${HOME-<unset>}" "${PATH-<unset>}"
getent passwd "$(id -u)" | cut -d: -f1,3,6,7
command -v ssh
ssh -V
if test -t 0; then printf 'stdin has a TTY\n'; else printf 'no stdin TTY\n'; fi
if test -n "${SSH_AUTH_SOCK-}"; then
    ssh-add -l
fi
```

Do not dump the complete environment or enable shell tracing around credentials. Record the runner/container, executable, numeric identity, working directory, and expected destination. A different container can also have different DNS or network access.

Cronie runs a user's crontab under that account, sets `HOME` from its account record, and defaults `SHELL` to `/bin/sh`; crontab settings can override `HOME` and `SHELL`. System crontabs additionally specify a username. These are [Cronie semantics](https://manpages.ubuntu.com/manpages/noble/man5/crontab.5.html), not universal CI defaults.

## Separate account home from shell expansion

Changing environment strings does not change UID, groups, permissions, or the account database. `env -i` can reproduce missing environment variables, but cannot turn your workstation account into the runner's identity.

In Bash, unquoted `~` normally expands using `HOME`; `"$HOME/.ssh/key"` also uses that variable. Noninteractive Bash can read `BASH_ENV`, so merely selecting Bash does not reproduce a clean interactive environment. See [Bash expansion and invocation](https://manpages.ubuntu.com/manpages/noble/man1/bash.1.html).

OpenSSH's default user configuration lookup instead uses the local account's home from `getpwuid(getuid())`. Its own tilde expansion also consults account records. Consequently, changing `HOME` alone does not relocate every OpenSSH file. Compare the [configuration lookup](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh.c) and [tilde implementation](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/misc.c).

Inspect the same alias and options in each context:

```bash
ssh -G deploy-target | awk '
$1 ~ /^(hostname|user|port|identityfile|identityagent|userknownhostsfile|proxyjump|proxycommand|batchmode|requesttty)$/ {print}
'
```

`ssh -G` evaluates configuration without connecting, but trusted configuration can contain `Match exec` commands. It does not prove file readability or authentication. Use absolute paths, an explicit working directory, and the intended interpreter in the eventual job. [OpenSSH configuration evaluation](https://man.openbsd.org/ssh#G)

## Provision trust before connecting

Supply a dedicated `known_hosts` file through an authenticated provisioning process. Verify the complete host-key fingerprint against an independent trusted source, and bind it to the actual hostname and port; a nonstandard port normally needs `[hostname]:port`.

`ssh-keyscan` collects presented keys; it cannot authenticate them. Piping an unverified scan into the job's trust file only makes the first connection noninteractive. [ssh-keyscan security requirements](https://man.openbsd.org/ssh-keyscan)

Use `StrictHostKeyChecking=yes` so missing or changed trust fails. Establish credentials separately: a trusted server can still reject your account or key.

## Put the dependencies in one wrapper

This directly reachable, port-22 example expects two **absolute filenames**, supplied through the scheduler's approved credential mechanism. The key must be usable without a passphrase prompt. It does not handle certificate files or interactive MFA; do not strip protection from a personal key to fit the example. Replace the host, account, directory, and diagnostic command before deployment.

```bash
#!/bin/bash
set +x
set -euo pipefail
export PATH=/usr/bin:/bin
umask 077
: "${DEPLOY_KEY_FILE:?Supply an absolute key filename}"
: "${DEPLOY_KNOWN_HOSTS_FILE:?Supply an absolute verified trust filename}"
[[ $DEPLOY_KEY_FILE == /* && $DEPLOY_KNOWN_HOSTS_FILE == /* ]] || exit 2
cd /opt/deploy || exit 2

job_dir=$(mktemp -d /tmp/ssh-job.XXXXXXXX)
cleanup() {
    local exit_status=$?
    trap - EXIT
    if ! rm -rf -- "$job_dir"; then
        printf 'ssh job cleanup failed\n' >&2 || :
        if (( exit_status == 0 )); then exit_status=1; fi
    fi
    exit "$exit_status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
install -m 600 -- "$DEPLOY_KEY_FILE" "$job_dir/key"
install -m 600 -- "$DEPLOY_KNOWN_HOSTS_FILE" "$job_dir/known_hosts"

status=0
/usr/bin/timeout --kill-after=5s 60s \
    /usr/bin/ssh -F /dev/null -nT \
    -o BatchMode=yes -o StrictHostKeyChecking=yes \
    -o "UserKnownHostsFile=$job_dir/known_hosts" \
    -o IdentitiesOnly=yes -o IdentityAgent=none \
    -o ConnectTimeout=10 -o ControlPath=none \
    -i "$job_dir/key" -p 22 deploy@deploy.example.com \
    '/usr/bin/id' || status=$?
printf 'ssh job exit=%s\n' "$status" >&2
exit "$status"
```

The private directory and copied files belong to this invocation. Normal exits and handled signals attempt to remove those copies. A cleanup error is reported and makes an otherwise successful run fail while preserving an existing failure status. SIGKILL or runner loss can bypass cleanup. Exclude credentials from artifacts/caches and arrange runner teardown. The original secret files remain the provisioning system's responsibility.

File delivery differs by platform. For example, a [GitLab file-type variable](https://docs.gitlab.com/ci/variables/#use-file-type-cicd-variables) contains a temporary **filename**, whereas an ordinary variable contains its value. Configure these inputs accordingly; never print key contents to diagnose the distinction.

`-F /dev/null` removes user and system SSH configuration. Reintroduce required bastion, certificate, and organizational settings through an approved job configuration instead; global known-hosts files still have their defaults. `-nT` redirects SSH's stdin from `/dev/null` and disables remote PTY allocation. [OpenSSH command options](https://man.openbsd.org/ssh)

`BatchMode` suppresses interactive authentication and host-confirmation prompts. It does not stop remote command hangs. `ConnectTimeout` bounds connection establishment and initial handshake, not command duration. `IdentityAgent=none` deliberately selects file authentication; `IdentitiesOnly` restricts offered identities. [OpenSSH client settings](https://man.openbsd.org/ssh_config)

GNU `timeout` bounds the local SSH process: normally status 124 indicates its deadline; forced killing can produce 137. It does **not** guarantee remote work stops after disconnect. Design remote jobs for cancellation and safe retries. SSH otherwise returns the remote exit status, or 255 on an SSH error; inspect stderr because a remote command can also return 255. [timeout behavior](https://manpages.ubuntu.com/manpages/noble/man1/timeout.1.html), [SSH exit status](https://man.openbsd.org/ssh#EXIT_STATUS)

## If an agent is required

Do not copy a workstation socket pathname into CI. The actual job needs access to a live agent, and `IdentityAgent` can override `SSH_AUTH_SOCK`. `ssh-add -l` checks advertised identities, not whether a constrained key can successfully sign. [ssh-add](https://man.openbsd.org/ssh-add)

For a job-owned agent, command mode provides a useful lifecycle:

```bash
/usr/bin/ssh-agent -t 300 /bin/bash /opt/deploy/agent-job.sh
```

That child must load the intended key through an approved noninteractive unlocking mechanism, fail if loading fails, and run SSH within the same environment. Adjust the wrapper's `IdentityAgent=none` deliberately and select the corresponding public identity with `IdentitiesOnly`. Starting an agent does not unlock an encrypted key. The agent exits with its child; `-t 300` limits loaded identities' default lifetime, not job duration. [ssh-agent lifecycle](https://man.openbsd.org/ssh-agent)

Finally, allocate a PTY only when the remote program explicitly requires one. `-tt` can force allocation without a local terminal, but cannot repair host trust, missing keys, or authorization. After authentication succeeds, diagnose the remote command's own PATH, directory, prompts, and exit status separately. [PTY options](https://man.openbsd.org/ssh#t)
