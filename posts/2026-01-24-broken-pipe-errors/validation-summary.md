# Validation Summary: How to Fix 'Broken Pipe' Errors in Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Linux pipes, FIFOs, SIGPIPE, and EPIPE
- OpenSSH client and server configuration
- Bash pipelines and process substitution
- TCP keepalive sysctl settings
- rsync, wget, curl, scp, strace, lsof, journalctl
- Python BrokenPipeError handling
- screen and tmux

## Sources Consulted
- Linux pipe(7) manual: https://man7.org/linux/man-pages/man7/pipe.7.html
- Linux tcp(7) manual: https://man7.org/linux/man-pages/man7/tcp.7.html
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config
- OpenSSH sshd_config(5) manual: https://man7.org/linux/man-pages/man5/sshd_config.5.html
- GNU Bash process substitution manual: https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html
- Python signal module documentation, "Note on SIGPIPE": https://docs.python.org/3/library/signal.html#note-on-sigpipe
- wget(1) manual: https://man7.org/linux/man-pages/man1/wget.1.html
- curl manual: https://curl.se/docs/manpage.html
- Local command help/man pages for ssh, ssh_config, sshd_config, rsync, wget, curl, scp, strace, bash, and sysctl on Ubuntu/OpenSSH 9.6p1.

## Issues Found
- The SSH client configuration example used `sudo nano ~/.ssh/config`, which can create or edit the user's SSH config as root. Changed it to `nano ~/.ssh/config`.
- The SSH restart commands only showed the `sshd` service name. Added `ssh` alternatives because Debian/Ubuntu commonly use `ssh`.
- The Bash SIGPIPE examples ignored SIGPIPE and then checked writes to `/dev/null`, which does not test whether the pipeline consumer is still connected. Changed the examples to exit cleanly on SIGPIPE or failed stdout writes.
- The process substitution description said Bash always creates named pipes. Corrected it to say Bash uses named pipes or `/dev/fd`, depending on system support.
- The debugging examples used `<PID>` inside shell snippets, which is not valid Bash syntax. Replaced those placeholders with a `PID` variable.
- The Python example set `SIGPIPE` to `SIG_DFL` while claiming to handle `BrokenPipeError`; Python documentation recommends catching `BrokenPipeError` instead. Updated the example to catch `BrokenPipeError` and redirect stdout to `/dev/null` during shutdown.
- The monitoring script attempted to count the last five minutes with `grep -c ... | tail`, but `grep -c` returns a single total count for the whole file. Replaced it with `journalctl --since "5 minutes ago" | grep -c`.

## Review Notes
The remaining examples are broadly correct for common Linux distributions, but service names and log locations vary by distribution. The TCP keepalive sysctl values apply only to sockets with TCP keepalive enabled.
