# Validation Summary: SSH Remote Port Forwarding Failed: Bind Conflicts, GatewayPorts, and Policy

## Status
validated

## Post Type
Operational troubleshooting guide with SSH and Linux socket-inspection commands.

## Technologies Covered
- OpenSSH portable 9.9p1 and OpenBSD 7.6 forwarding semantics.
- Static remote TCP forwarding, multiplexing, address families, and GatewayPorts.
- Server and authorized-key forwarding permissions.
- Linux iproute2 socket inspection.

## Sources Consulted
- [OpenBSD 7.6 ssh manual](https://man.openbsd.org/OpenBSD-7.6/ssh.1): static -R syntax, -G, -N, and control-socket options.
- [OpenBSD 7.6 ssh_config manual](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5): Match execution, ExitOnForwardFailure, ForkAfterAuthentication, and PermitRemoteOpen.
- [OpenBSD 7.6 sshd_config manual](https://man.openbsd.org/OpenBSD-7.6/sshd_config.5): GatewayPorts, PermitListen, AllowTcpForwarding, DisableForwarding, and AddressFamily.
- [OpenBSD 7.6 sshd manual](https://man.openbsd.org/OpenBSD-7.6/sshd.8): authorized-key forwarding restrictions and listen-token matching.
- [OpenSSH 9.9p1 channels.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/channels.c): bind-address selection and listener setup across address families.
- [OpenSSH 9.9p1 serverloop.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/serverloop.c): remote forwarding authorization before listener creation.
- [OpenSSH 9.9p1 mux.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/mux.c): reuse of identical forwarding requests through a master connection.
- [iproute2 ss manual](https://raw.githubusercontent.com/iproute2/iproute2/main/man/man8/ss.8): listening TCP sockets, process information, and source-port filters.

## Issues Found
No technical issues found.

## Review Notes
- README left unchanged. The relay hosts the requested listener, while the SSH client resolves and connects to the final static forwarding destination.
- Verified the important GatewayPorts distinction: yes forces wildcard binding; no permits loopback forwarding and preserves an explicit loopback family; clientspecified honors the requested address. These controls are separate from forwarding authorization.
- Confirmed that an omitted listen address is sent as localhost and differs from explicit 127.0.0.1 for PermitListen matching. Key restrictions can narrow the server policy further, while PermitRemoteOpen applies to remote SOCKS destinations rather than this static target.
- Both shell examples passed /bin/sh -n. A configuration-only ssh -G invocation, isolated with -F none for the local check, accepted the forwarding syntax and reported the expected remote endpoint, ExitOnForwardFailure=yes, ForkAfterAuthentication=no, and disabled connection sharing.
- The Linux ss expression is supported by the upstream manual. It was not executed on this macOS review host.
- No live tunnel, relay policy change, socket bind, or production connection was performed. The article correctly treats actual listener inspection and application probing as separate operational checks. Version-pinned references describe the stated baseline rather than the newest OpenSSH release.
