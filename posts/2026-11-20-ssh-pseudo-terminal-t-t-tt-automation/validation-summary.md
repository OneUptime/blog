# Validation Summary: SSH Pseudo-Terminal Allocation: When to Use `-T`, `-t`, or `-tt`

## Status

validated

## Post Type

Technical guide and troubleshooting reference with shell automation examples.

## Technologies Covered

- SSH and OpenSSH client/server behavior, including OpenSSH 10.3p1.
- Pseudo-terminals, terminal line discipline, standard descriptors, and signals.
- POSIX-style shell scripting, here-documents, redirections, and exit status.
- SSH client configuration, server policy, and authorized-key restrictions.

## Sources Consulted

- [OpenBSD ssh(1)](https://man.openbsd.org/ssh): terminal allocation flags, stdin handling, background execution, remote commands, and exit status.
- [OpenBSD ssh_config(5)](https://man.openbsd.org/ssh_config): RequestTTY, RemoteCommand, BatchMode, StrictHostKeyChecking, and terminal environment handling.
- [OpenSSH 10.3p1 ssh.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh.c): client allocation decisions, nonterminal stdin warning, and the interaction of -n, -f, and forced allocation.
- [OpenSSH 10.3p1 clientloop.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/clientloop.c): PTY confirmation failures and ordering of PTY and command requests.
- [OpenSSH 10.3p1 session.c](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/session.c): remote descriptor setup for terminal sessions.
- [OpenBSD sshd_config(5), PermitTTY](https://man.openbsd.org/sshd_config#PermitTTY): server permission to allocate terminals.
- [OpenBSD sshd(8), authorized keys](https://man.openbsd.org/sshd#AUTHORIZED_KEYS_FILE): no-pty, restrict, and the pty override.
- [OpenBSD termios(4)](https://man.openbsd.org/termios.4): input processing, output newline conversion, controlling terminals, job control, and disconnect behavior.
- [Ubuntu Noble dash(1)](https://manpages.ubuntu.com/manpages/noble/man1/dash.1.html): shell syntax, quoted here-documents, sh -s, exec, test predicates, redirection, and status handling.

## Issues Found

No technical issues found.

## Review Notes

- The post contains relevant implementation guidance and executable shell examples. README.md was left unchanged.
- Verified all four RequestTTY modes and their command-line equivalents. The cited client source confirms that allocation depends on stdin, that -f implies null stdin, and that force bypasses the terminal-input check without restoring input.
- Confirmed the wrapper captures the failed SSH command's status immediately in the else branch. The script example correctly retains stdin, quotes the here-document delimiter, checks the directory and file, and replaces the shell with cat.
- Confirmed that test -t checks whether each descriptor is associated with a terminal. The diagnostic remote command needs no interactive input; forcing a terminal does not supply answers to other programs.
- Verified that a PTY combines the remote standard output and error paths and can introduce terminal processing. Disabling allocation is appropriate for binary or machine-readable data, subject to the post's warning about other output contamination.
- Confirmed the version-specific refusal behavior against V_10_3_P1: explicit yes/force failures are fatal for the primary session, while auto can continue. Session setup sends the command request without waiting for PTY confirmation, so a refusal cannot establish that the command never ran.
- Confirmed that server and key restrictions cannot be overridden by repeated client -t flags. The post appropriately avoids promising that disconnects cancel every descendant.
- The cited documentation and version-pinned source URLs resolved to the intended resources. Version-specific implementation claims were checked against the named release rather than inferred solely from the current manuals.
- All four fenced shell examples passed local /bin/sh -n syntax validation. No SSH connection to deploy-target was attempted, and no deployment environment, credentials, application directory, or installed top program was assumed available. Runtime success remains dependent on the prerequisites stated in the post.
