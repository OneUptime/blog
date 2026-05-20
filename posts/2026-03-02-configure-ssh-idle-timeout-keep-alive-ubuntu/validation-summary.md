# Validation Summary: How to Configure SSH Idle Timeout and Keep-Alive on Ubuntu

## Status
validated

## Post Type
Tutorial / Server administration guide

## Technologies Covered
- Ubuntu
- OpenSSH client and server configuration
- SSH keep-alive options
- Bash `TMOUT`
- systemd service management

## Sources Consulted
- OpenSSH official manual page index: https://www.openssh.org/manual.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- GNU Bash Reference Manual, `TMOUT`: https://www.gnu.org/software/bash/manual/bash.html
- Local Ubuntu/Debian man pages for `ssh_config(5)`, `sshd_config(5)`, and `bash(1)`
- Local `ssh -G` output for client option names/defaults

## Issues Found
- The post described `ClientAliveInterval` and `ClientAliveCountMax` as a way to disconnect truly idle users. OpenSSH documents these settings as a mechanism for detecting unresponsive clients, not as an interactive idle-user timeout. Updated the server-side section, table, and summary to distinguish unresponsive connection cleanup from shell idle enforcement.
- The example comment for `ClientAliveInterval 120` / `ClientAliveCountMax 3` said it disconnected after 10 minutes. The product is 360 seconds, or about 6 minutes. Corrected the comment.
- The `ClientAliveCountMax 0` example implied it keeps sessions alive indefinitely because of inactivity. OpenSSH documents this value as disabling connection termination from the client-alive mechanism. Updated the wording accordingly.
- The `TCPKeepAlive` explanation said SSH-level keep-alives are more reliable because TCP keepalives can be lost if routing changes. OpenSSH's documented caveats are that TCP keepalives are spoofable and may drop connections when the route is temporarily down. Updated the explanation.
- The `/etc/profile.d/timeout.sh` permissions command used `chmod +x`. Profile scripts are sourced by the shell and do not need to be executable, so this was changed to `chmod 644`.

## Review Notes
- The OpenSSH client options and command-line `ssh -o` examples are valid.
- On Ubuntu, `systemctl restart ssh` and `systemctl status ssh` are appropriate for the OpenSSH server service.
- `TMOUT` only applies to shells that read the relevant startup file and can be bypassed in some non-Bash or non-interactive workflows, but the post's Bash-focused explanation is accurate.
