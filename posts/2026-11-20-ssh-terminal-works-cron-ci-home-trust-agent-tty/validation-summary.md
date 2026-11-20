# Validation Summary: SSH Works in Terminal but Fails in Cron or CI: HOME, Trust, Agent, and TTY

## Status
validated

## Post Type
Technical troubleshooting guide with diagnostic commands and a deployment wrapper.

## Technologies Covered
- Linux process identity, account lookup, permissions, and terminal state
- Bash expansion, startup files, error handling, and signal traps
- OpenSSH client configuration, host trust, public-key authentication, agents, and PTYs
- Cronie scheduling and job environments
- GNU coreutils temporary directories, file installation, and process timeouts
- GitLab CI/CD file-type variables

## Sources Consulted
- [OpenSSH ssh manual](https://man.openbsd.org/ssh): configuration evaluation, command-line flags, terminal allocation, and exit status.
- [OpenSSH ssh_config manual](https://man.openbsd.org/ssh_config): batch mode, identity and agent selection, host verification, connection timeout, and control sockets.
- [OpenSSH ssh-keyscan manual](https://man.openbsd.org/ssh-keyscan): collected keys require independent authentication.
- [OpenSSH sshd manual](https://man.openbsd.org/sshd#SSH_KNOWN_HOSTS_FILE_FORMAT): known-hosts entries and remote command execution.
- [OpenSSH ssh-agent manual](https://man.openbsd.org/ssh-agent): command-mode lifecycle and identity lifetime.
- [OpenSSH ssh-add manual](https://man.openbsd.org/ssh-add): identity listing, signing tests, constraints, and unlocking.
- [OpenSSH portable ssh.c at V_10_3_P1](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh.c): account lookup and default configuration path.
- [OpenSSH portable misc.c at V_10_3_P1](https://raw.githubusercontent.com/openssh/openssh-portable/V_10_3_P1/misc.c): account-based tilde expansion.
- [Cronie crontab manual, Ubuntu Noble](https://manpages.ubuntu.com/manpages/noble/man5/crontab.5.html): job ownership, HOME, SHELL, and system-crontab usernames.
- [GNU Bash manual page, hosted by man7](https://www.man7.org/linux/man-pages/man1/bash.1.html): shell syntax, HOME expansion, BASH_ENV, builtins, and traps.
- [getent manual](https://man7.org/linux/man-pages/man1/getent.1.html): numeric passwd lookup.
- [GNU coreutils timeout manual, Ubuntu Noble](https://manpages.ubuntu.com/manpages/noble/man1/timeout.1.html): deadline, kill-after, and exit-status behavior.
- [GNU coreutils mktemp manual, Ubuntu Noble](https://manpages.ubuntu.com/manpages/noble/man1/mktemp.1.html): private temporary directory creation.
- [GNU coreutils install manual, Ubuntu Noble](https://manpages.ubuntu.com/manpages/noble/man1/install.1.html): copying files with explicit permissions.
- [GitLab CI/CD variables documentation](https://docs.gitlab.com/ci/variables/#use-file-type-cicd-variables): file variables expose a temporary filename.

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all four Bash code blocks; each passed `/bin/bash -n`. A local `ssh -G` check using the wrapper's SSH flags and harmless placeholder paths exited successfully without connecting to a server.
- Confirmed that changing HOME does not change process identity or OpenSSH's default user configuration lookup. The pinned OpenSSH source links resolve and support the account-home and tilde-expansion explanations.
- Confirmed the separation of host trust from authentication, the warning about unverified scans, and the distinction between listing agent identities and proving signing capability.
- The wrapper correctly disables configuration-file inheritance and agent use, supplies an explicit identity and user trust file, disables stdin and remote PTY allocation, and sets connection and local process time limits. Global known-hosts defaults remain active, as the post explicitly states.
- Reviewed cleanup control flow: normal exit status is preserved; cleanup failure changes an otherwise successful result to failure; handled signals request cleanup. Uncatchable termination and runner loss remain documented limitations.
- Agent command mode and the default lifetime of loaded identities are correctly distinguished from overall job duration. Remote work is not guaranteed to terminate when the local SSH process ends.
- The Linux, Bash, GNU coreutils, and Cronie scope is explicit. The local syntax and SSH parsing checks ran on macOS; no complete Linux cron/CI run or live authentication test was performed. Deployment requires the documented host, account, directory, credential, and trust substitutions.
- The Ubuntu Bash URL and GNU manual endpoints timed out during retrieval. Bash behavior was cross-checked against the Bash manual hosted by man7; the original Ubuntu URL remains a plausible manual-page reference and was not changed solely because of a retrieval timeout.
- No deprecated options or unsupported version-specific claims were identified. README.md was left unchanged.
