# Validation Summary: How to Use SSH Escape Sequences to Manage IPv4 Port Forwards at Runtime

## Status
validated

## Post Type
Technical tutorial / CLI guide

## Technologies Covered
- OpenSSH client
- SSH escape sequences
- Local and remote TCP port forwarding
- IPv4 loopback and private-address forwarding examples

## Sources Consulted
- OpenBSD/OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenBSD/OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- Local OpenSSH client documentation and effective config from `OpenSSH_9.6p1 Ubuntu-3ubuntu13.15`

## Issues Found
- The post said `~C` opens the SSH command prompt without noting that current OpenSSH disables this prompt by default. Added `ssh -o EnableEscapeCommandline=yes ...` and updated the relevant explanation/key takeaway.
- The escape sequence table listed `~Z`, but OpenSSH documents the background/suspend escape as `~^Z`. Corrected the sequence.
- The table described `~&` as a general background command. OpenSSH documents it as backgrounding SSH at logout while forwarded or X11 connections finish. Corrected the wording.
- The listing example showed `ssh> #`, which implied `~#` was entered at the `ssh>` command prompt. Corrected it to show that `~#` is typed in the active SSH session.
- The post described `~#` as listing active port forwards. OpenSSH documents it as listing forwarded connections, so the heading, example comments, and key takeaway were narrowed to that behavior.
- Runtime cancellation examples used spaced forms such as `-KL 8080`; OpenSSH documents cancellation as `-KL[bind_address:]port` and `-KR[bind_address:]port`. Updated examples to `-KL8080`, `-KR9090`, and `-KL7777`.
- IPv4-focused examples used `localhost`, which may resolve to IPv6 depending on system configuration. Updated local test URLs and the remote-forward target to `127.0.0.1`.

## Review Notes
The examples assume an interactive SSH session with a pseudo-terminal, which is required for escape characters. Remote forwards without an explicit bind address listen on the remote side according to the SSH server/client defaults, commonly loopback-only unless configured otherwise.
