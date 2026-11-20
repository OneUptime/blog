# `client_loop: send disconnect: Broken pipe`: Separate Idle NAT Timeouts from Server-Side Session Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Linux, Networking, Troubleshooting

Description: Diagnose SSH broken pipe errors by correlating idle periods, network events, server policies, and remote job state before changing keepalives.

An SSH terminal goes quiet, you press Enter, and this appears:

```text
client_loop: send disconnect: Broken pipe
```

That line identifies a failed operation, not the device responsible. In [OpenSSH 9.9p1's client loop](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/clientloop.c), `send disconnect` is reported when preparing or flushing the final disconnect message fails. The original failure may appear earlier. Read the preceding output before concluding that an idle NAT mapping expired.

This guide uses OpenSSH 9.9 behavior as its reference. Check `ssh -V` locally and the server's installed package version; distribution backports and newer releases can differ. The commands below inspect configuration or existing logs without opening a connection or changing the server.

## Build a timeline before choosing a timeout

Record the destination, username, route or bastion, last successful interaction, error time, and whether the laptop slept or changed networks. Normalize client, server, and network timestamps to UTC and account for clock skew. Distinguish the time traffic stopped from the later moment you discovered the failure.

Use these observations as hypotheses to investigate:

| Observation | Evidence to seek |
|---|---|
| Failure appears on the first keystroke after a repeatable quiet period | The actual NAT/firewall idle limit and matching flow-expiration records |
| Connection fails during sustained traffic | Packet loss, VPN/routing events, server reboot, resource exhaustion, or session termination |
| Failure follows sleep, Wi-Fi roaming, or VPN reconnection | Endpoint/network events and changed addressing; an old connection may no longer be usable |
| Server closes a session at a consistent boundary | A matching session/channel policy or process-exit record |

A command doing CPU work without producing output can leave its SSH connection idle. Conversely, a quiet terminal might share a connection with active forwarding channels. Judge network inactivity from traffic evidence, not typing or application progress alone.

AWS provides a concrete example: its NAT gateway expires connections idle for **350 seconds** and sends a reset when a resource behind it tries to resume that connection. That rule applies to traffic traversing that product, not every cloud VM or SSH path. A reset or a roughly six-minute interval alone does not identify the gateway. [AWS NAT troubleshooting](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-troubleshooting.html)

Correlate the affected connection with gateway records and endpoint logs. AWS's `IdleTimeoutCount` can support the investigation, but it counts connections across the gateway; a spike cannot identify your particular SSH session. [NAT gateway metrics](https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html)

## Read the server's explanation

For a Linux server using systemd, an operator with journal access can inspect a narrow interval. Substitute the incident times and the installed service name (`ssh.service` or `sshd.service`):

```bash
journalctl -u ssh.service --utc \
  --since '2026-11-20 10:00:00 UTC' \
  --until '2026-11-20 10:10:00 UTC' \
  -o short-iso --no-pager
```

Keep the surrounding entries, including authentication, disconnect, process, and service events. Separately inspect host/kernel events for reboot or memory pressure. Missing entries can mean inadequate permissions or retention, not proof that the server was healthy. On other systems, use their authentication and system logs. The time filters and UTC output are documented in [journalctl](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html).

Inspect the effective server configuration for the affected connection, including `Include` and `Match` rules. On the OpenSSH 9.9 reference server, this parses configuration without starting a listener. Replace the connection attributes as seen by that server, and reproduce any service `-f` or `-o` overrides. With the default `UseDNS no`, `host` is the numeric source address:

```bash
/usr/sbin/sshd -G -T \
  -C user=ops,addr=198.51.100.25,host=198.51.100.25,laddr=192.0.2.10,lport=22
```

Both flags are intentional: the [9.9p1 implementation](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/sshd.c) requires `-T` with `-C`, while `-G` prints and exits before host-key loading. With `UseDNS yes`, supply the verified reverse/forward DNS name the daemon actually obtained, or its numeric fallback. `-C host=` supplies a test value; it does not perform that lookup for you. This needs permission to read the configuration. It describes the files now, so compare them with the configuration loaded when the failed session began. Older installations should use their installed manual's supported inspection mode. [sshd configuration inspection](https://man.openbsd.org/OpenBSD-7.6/sshd.8)

Three mechanisms answer different questions:

- `ClientAliveInterval` and `ClientAliveCountMax`: the server requests an SSH response after receiving no client data for the interval. The defaults are interval `0` (disabled) and count `3`; count `0` disables this mechanism's disconnection. A reachable client normally responds without keyboard activity.
- `ChannelTimeout`: expires inactive channels; by default none expire. A `session` timeout can expire while another channel is busy; `global` instead measures activity across channels. Closure need not close the connection or terminate every associated process.
- `UnusedConnectionTimeout`: expires an authenticated connection with no open channels; default `none` disables it. A forwarding listener alone does not count as an open channel.

These distinctions are documented in [sshd_config](https://man.openbsd.org/OpenBSD-7.6/sshd_config.5). The two timeout directives arrived on the server in [OpenSSH 9.2](https://www.openssh.org/txt/release-9.2); client-side `ChannelTimeout` arrived in [9.6](https://www.openssh.org/txt/release-9.6). SSH alive requests do not count as channel data or create an open channel, so they do not defeat either timeout. See the reference [channel activity handling](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/channels.c) and [connection timer handling](https://raw.githubusercontent.com/openssh/openssh-portable/V_9_9_P1/serverloop.c). Also inspect intentional shell/logout and session-manager policies.

## Choose keepalives for the observed path

`ServerAliveInterval` sends an encrypted SSH request from client to server after no incoming server data for the specified interval; its default `0` disables it. `ServerAliveCountMax` defaults to `3` and limits probes without receiving server messages. `TCPKeepAlive` enables operating-system TCP probes; its timing is separate from these SSH settings. [Client keepalive semantics](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5)

If evidence supports idle expiration, discuss a suitable interval with the network owner. The following is a candidate for one host, not a universal fix. Save it as a scratch file named `ssh-keepalive.conf`:

```sshconfig
Host ops-example
    HostName 192.0.2.10
    ServerAliveInterval 30
    ServerAliveCountMax 3
    TCPKeepAlive yes
```

Inspect it locally:

```bash
ssh -G -F ./ssh-keepalive.conf ops-example |
  awk '/^(hostname|serveraliveinterval|serveralivecountmax|tcpkeepalive) /'
```

`-G` prints configuration and exits; `-F` selects this file and bypasses the system configuration. This controlled example contains no includes, hostname canonicalization, or `Match exec` commands. Arbitrary existing configuration can execute commands during evaluation, so review it first. [ssh command options](https://man.openbsd.org/OpenBSD-7.6/ssh.1), [configuration evaluation](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5)

Treat the interval/count combination as a liveness policy, not an exact wall-clock deadline. Shorter detection can also abandon a temporarily disrupted connection sooner. If adopted, place specific host settings before general defaults because the first obtained value normally wins. Apply the settings to a new connection: a session reusing an existing `ControlMaster` retains that master's transport and keepalive settings. [ssh_config](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5)

Successful probes demonstrate SSH responsiveness, not application health. They may refresh network state when the device counts that traffic, but cannot guarantee NAT retention, repair an outage, revive a terminated process, or override intentional session policies. Validate the same idle/active scenarios after any approved change.

## Recover the job before retrying it

After connectivity returns, establish whether the remote operation completed, remains running, or stopped partway. Check its durable status, output, checkpoints, and transaction identifiers. A missing final response leaves the result uncertain; blindly repeating a deployment or migration can duplicate work. Resume from an established checkpoint or use an idempotent retry path.

For future interactive work, tmux can keep its session and programs running after its client detaches. Its server and the remote processes have their own lifetime: host reboot, process termination, or session-manager cleanup can still end them. It neither repairs SSH nor resurrects an already lost job. Reattach only after checking the surviving session. [tmux's session model](https://github.com/tmux/tmux/wiki/Getting-Started)
