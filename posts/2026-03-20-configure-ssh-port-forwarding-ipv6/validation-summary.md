# Validation Summary: How to Configure SSH Port Forwarding over IPv6

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenSSH client (`ssh`) — `-L`, `-R`, `-D`, `-N`, `-6`, `-o` flags
- OpenSSH server (`sshd`) — `GatewayPorts`, `AllowTcpForwarding`, `Match`, `ForceCommand`
- ssh_config directives — `LocalForward`, `RemoteForward`, `DynamicForward`, `ServerAliveInterval`, `ServerAliveCountMax`, `ExitOnForwardFailure`
- IPv6 addressing and bracket notation (RFC 3986)
- SOCKS5 proxy
- `curl --socks5`
- `autossh` for persistent tunnels
- systemd unit files

## Sources Consulted
- `ssh(1)` man page (OpenSSH) — verified `-L [bind_address:]port:host:hostport`, `-R`, `-D`, `-N`, `-6`, `-o` syntax
- `ssh_config(5)` man page — verified `LocalForward`, `RemoteForward`, `DynamicForward`, `GatewayPorts`, `ExitOnForwardFailure`, `ServerAliveInterval`, `ServerAliveCountMax`
- `sshd_config(5)` man page — verified `GatewayPorts {no|yes|clientspecified}`, `AllowTcpForwarding`, `Match`, `ForceCommand`
- `curl(1)` man page — verified `--socks5 <host[:port]>` syntax including IPv6 bracket support
- autossh documentation — verified `-M 0 -N -o` flag usage
- systemd.unit and systemd.exec docs — verified line continuation with backslash in `ExecStart`
- RFC 3986 — IPv6 address bracket notation in URI authority components

## Issues Found
No technical issues found. All SSH command-line syntax, IPv6 bracket usage, ssh_config / sshd_config directives, `autossh` invocation, `curl --socks5` form, and the systemd unit file are correct as presented.

## Review Notes
- The `user@2001:db8::10` destination form works with OpenSSH because everything after `@` is parsed as the host (no brackets are needed in this position; brackets are required in URI form `ssh://user@[2001:db8::10]:port`).
- The `ssh -R "[2001:db8::10]:9090:..."` example binds the remote forward to a specific IPv6 address on the server. This requires `GatewayPorts clientspecified` in `sshd_config`. The post mentions `GatewayPorts clientspecified` later in the `sshd_config` section, but does not explicitly call out that the `-R` example with a non-localhost bind address depends on it. This is a minor documentation gap rather than a technical error.
- The `curl --socks5 "[::1]:1080" http://internal-service/` example resolves DNS locally; users who need DNS resolution through the proxy should use `--socks5-hostname` instead. The example as written is technically valid for hosts that resolve locally.
- The systemd `ExecStart` uses backslash line continuations, which is supported by systemd's unit file parser.
- IPv6 documentation prefix `2001:db8::/32` (RFC 3849) is correctly used throughout.
