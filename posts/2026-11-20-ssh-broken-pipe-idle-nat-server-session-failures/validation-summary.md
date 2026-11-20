# Validation Summary: SSH `Broken pipe`: Idle NAT Timeouts vs. Server Session Failures

## Status
validated

## Post Type
Operational troubleshooting guide with shell commands and OpenSSH configuration examples.

## Technologies Covered
- OpenSSH 9.9p1 client and server configuration, keepalives, channel timeouts, connection sharing, and configuration inspection.
- AWS NAT gateways and CloudWatch NAT gateway metrics.
- Linux systemd journal filtering and UTC timestamps.
- tmux session persistence and remote job recovery.

## Sources Consulted
- [OpenBSD 7.6 ssh(1)](https://man.openbsd.org/OpenBSD-7.6/ssh.1): configuration inspection and alternative configuration files.
- [OpenBSD 7.6 ssh_config(5)](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5): keepalive defaults, host matching, configuration precedence, command evaluation, and connection sharing.
- [OpenBSD 7.6 sshd(8)](https://man.openbsd.org/OpenBSD-7.6/sshd.8): server configuration inspection and connection attributes.
- [OpenBSD 7.6 sshd_config(5)](https://man.openbsd.org/OpenBSD-7.6/sshd_config.5): ClientAliveCountMax, ClientAliveInterval, ChannelTimeout, UnusedConnectionTimeout, and UseDNS.
- [OpenSSH 9.9p1 clientloop.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/clientloop.c): the final disconnect error and client keepalive handling.
- [OpenSSH 9.9p1 sshd.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/sshd.c): the requirement for -T when -C is supplied and the -G exit before host-key loading.
- [OpenSSH 9.9p1 channels.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/channels.c): channel activity accounting and inactivity deadlines.
- [OpenSSH 9.9p1 serverloop.c](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/serverloop.c): client alive requests and connection timer handling.
- [OpenSSH 9.2 release notes](https://www.openssh.org/txt/release-9.2): introduction of server channel and unused-connection timeouts.
- [OpenSSH 9.6 release notes](https://www.openssh.org/txt/release-9.6): introduction of client ChannelTimeout.
- [AWS NAT gateway troubleshooting](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-troubleshooting.html): the 350-second idle timeout and reset behavior.
- [AWS NAT gateway metrics](https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html): IdleTimeoutCount meaning and gateway-level scope.
- [systemd journalctl manual](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html): service filtering, time bounds, ISO output, and UTC display.
- [systemd time specification](https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html): timestamp syntax and timezone suffixes.
- [tmux Getting Started](https://github.com/tmux/tmux/wiki/Getting-Started): sessions, detach, reattach, and server lifetime.

## Issues Found
No additional technical issues found in the reviewed README. No content changes were required.

## Review Notes
- Confirmed that the quoted broken-pipe error occurs while preparing or flushing the final disconnect message and cannot identify the original failure or the responsible network device.
- Confirmed the separation between transport liveness, channel inactivity, and connections with no open channels. Keepalive requests do not substitute for channel data or create channels, and ClientAliveCountMax 0 disables that mechanism's termination behavior.
- Checked the version-specific server inspection command against the pinned OpenSSH 9.9p1 implementation. Combining -G and -T allows -C evaluation while exiting before host-key loading. The article correctly distinguishes test-supplied host values from DNS resolution and the current configuration from the configuration loaded by an existing session.
- All three Bash code blocks passed bash -n syntax checking. The SSH client example, extracted into a temporary configuration file, produced hostname 192.0.2.10, ServerAliveInterval 30, ServerAliveCountMax 3, and TCPKeepAlive yes.
- A separate temporary server configuration successfully parsed with sshd -G -T -f and the example -C attributes. A Match rule for the supplied user and source address applied the expected ClientAliveInterval. These local checks used OpenSSH 10.3p1 with LibreSSL 3.3.6 on macOS; the 9.9p1-specific behavior was additionally verified from source.
- The journal command was checked against the official systemd manuals and shell parser, not executed against production logs. No SSH connections, listeners, live server changes, NAT experiments, or remote job retries were performed.
- The AWS timeout example is appropriately limited to paths that traverse an AWS NAT gateway. Aggregate gateway metrics cannot by themselves identify a particular failed SSH flow. The keepalive and tmux guidance correctly retains the limits imposed by outages, process lifetime, host reboots, and session policies.
- The named OpenSSH release is an explicit behavior baseline rather than a claim to be the latest release. The README title and structure were preserved.
