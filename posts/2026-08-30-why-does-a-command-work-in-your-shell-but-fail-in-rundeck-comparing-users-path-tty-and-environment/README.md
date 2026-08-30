# Why Shell Commands Fail in Rundeck: Users, PATH, TTY, and Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Linux, SSH, PATH, Troubleshooting

Description: Reproduce Rundeck's non-interactive execution context and fix commands that depend on a different user, PATH, working directory, TTY, shell profile, or environment.

---

"It works over SSH" often means "it works in my interactive login shell." Rundeck may execute as a different local service account, connect as a different remote user, use a non-login non-interactive shell, start in another directory, and run without a terminal. The command text can be identical while almost every assumption around it changes.

## Establish Where the Step Runs

Without Runner delegation, a **Local Command** or other server-local step runs on the Automation Server under the operating-system account that runs Rundeck. A **Command** or node Script step runs through the selected Node Executor on each target, often over SSH using the resolved node, project, or framework SSH username. If an Enterprise Runner is selected, local execution or remote dispatch originates in that Runner's environment.

Record the step type, selected node, Node Executor provider, File Copier provider, Runner, and remote username before debugging. Testing on the wrong machine produces convincing but irrelevant results.

## Capture a Minimal Execution Fingerprint

Temporarily replace the failing action with a non-secret diagnostic script:

```bash
#!/usr/bin/env bash
set -eu

/usr/bin/id
/bin/pwd
printf 'shell_env=%s\n' "${SHELL-<unset>}"
printf 'bash=%s\n' "${BASH-<unset>}"
printf 'path=%s\n' "${PATH-<unset>}"
printf 'home=%s\n' "${HOME-<unset>}"
printf 'lang=%s\n' "${LANG-<unset>}"
printf 'umask='; umask
printf 'stdin_tty='; if /usr/bin/test -t 0; then echo yes; else echo no; fi
command -v python3 || true
command -v kubectl || true
```

Do not publish a complete environment dump from production: variable names and values can contain credentials. Prefer printing only the specific non-secret variables needed by the command.

Compare this with a close reproduction. For a remote SSH node:

```bash
sudo -u rundeck ssh -T deploy@app01.example.net \
  '/usr/bin/id; /bin/pwd; printf "path=%s\n" "$PATH"; command -v kubectl'
```

`-T` disables pseudo-terminal allocation and more closely resembles automation than an interactive `ssh deploy@app01` session.

## User and Filesystem Differences

Your shell may read files in `/home/alice`, use your SSH agent, access your kubeconfig, or belong to privileged groups. Rundeck's remote account might be `deploy`, while a local step is `rundeck`. Verify access as that identity:

```bash
sudo -u rundeck test -r /etc/myapp/release.yml
sudo -u rundeck test -x /opt/tools/bin/release
namei -l /opt/tools/bin/release
```

On the remote node, perform the equivalent test as the node username. Remember that read permission on a file is insufficient if the user cannot traverse a parent directory.

Do not solve this by changing ownership of broad application directories to `rundeck`. Grant the minimum group membership, ACL, storage credential, or constrained `sudoers` command needed for the job.

## PATH and Shell Initialization

With Bash, a login shell reads `/etc/profile` and then the first readable file among `~/.bash_profile`, `~/.bash_login`, and `~/.profile`; an interactive non-login shell reads `~/.bashrc`. Bash also reads `~/.bashrc` when it detects that a non-interactive shell was invoked by `sshd`, but other shells and configurations differ, so remote commands are not guaranteed to load the same files as an interactive login. Tools installed by `nvm`, `pyenv`, `rbenv`, Homebrew, or a user-local package manager can vanish from `PATH`.

The durable fix is explicit configuration:

```bash
#!/usr/bin/env bash
set -euo pipefail

export PATH='/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
export KUBECONFIG='/etc/rundeck/kubeconfigs/production'

exec /usr/local/bin/kubectl --context production get nodes
```

Use absolute executable and configuration paths for operational jobs. Avoid `source ~/.bashrc`: interactive startup files frequently print output, change directories, initialize agents, or return early based on terminal state.

Rundeck Script steps support an explicit invocation string, such as `sudo -u appuser ${scriptfile}`. Use it only with a reviewed sudo policy and quote-arguments setting appropriate to the script. Do not depend on whatever `/bin/sh` happens to be when the script requires Bash features; use a shebang and the desired interpreter.

## TTY and Sudo

Rundeck normally provides no interactive terminal. Commands that prompt for passwords, confirmations, MFA, license acceptance, or input will fail or hang. Check whether standard input is a terminal with `test -t 0` and make the tool non-interactive:

```bash
sudo -n /usr/local/sbin/restart-myapp
```

`sudo -n` fails immediately if a password would be required. Add a narrow `NOPASSWD` rule for the exact wrapper command if policy permits. Removing a global `requiretty` setting or allocating a pseudo-TTY can have security and output-handling consequences; it should not be the first fix.

Use flags such as `--non-interactive`, `--yes`, or `--no-input` only after reviewing what they approve. Supply sensitive input through the tool's supported secret mechanism, not through simulated keystrokes.

## Rundeck Context Variables

Rundeck exports context values with an `RD_` prefix for scripts, for example `$RD_JOB_NAME`, `$RD_NODE_HOSTNAME`, and `$RD_OPTION_ENVIRONMENT`. Inline scripts can also use tokens such as `@option.environment@`; command fields use `${option.environment}`.

For remote SSH execution, the SSH server must accept forwarded environment variables. Rundeck's SSH documentation shows an `sshd_config` rule:

```text
AcceptEnv RD_*
```

Reload sshd after a reviewed change. This wildcard exposes Rundeck-generated context to the remote process, so enable it only where required. Direct option/token expansion is often more portable than relying on SSH environment forwarding.

## Working Directory and Exit Status

Relative paths break when the working directory changes. Start scripts with an explicit directory or derive the script's own location:

```bash
cd /opt/myapp || exit 1
/usr/local/bin/docker compose --file /opt/myapp/compose.yml ps
```

Rundeck treats a nonzero process exit status as failure. An interactive shell alias or function may have hidden the real command, and pipelines can mask failures unless the script uses `set -o pipefail`. Capture standard error and the exact exit code, but do not add `|| true` unless failure is genuinely acceptable.

## Conclusion

Reproduce the same execution identity, machine, shell mode, TTY state, environment, and working directory that Rundeck uses. Then remove hidden dependencies: use absolute paths, explicit configuration, non-interactive flags, constrained sudo, and deliberate context-variable handling. That turns a personal-shell command into a dependable automation step.

## Official Documentation

- [Rundeck Node Execution](https://docs.rundeck.com/docs/manual/projects/node-execution/)
- [SSH Node Execution and remote environment variables](https://docs.rundeck.com/docs/manual/projects/node-execution/ssh.html)
- [Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html)
- [Built-in Node Steps and script invocation](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html)
