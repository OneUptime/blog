# Validation Summary: How to Configure GatewayPorts in sshd_config for IPv4 Remote Forwarding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH
- SSH remote port forwarding
- `sshd_config`
- `GatewayPorts`
- `PermitListen`
- Linux firewall rules with iptables
- Socket inspection with `ss`

## Sources Consulted
- OpenSSH `sshd_config(5)` manual, including `GatewayPorts`, `Match`, `PermitListen`, `PermitOpen`, and `PermitTTY`: https://man.openbsd.org/sshd_config
- OpenSSH `ssh(1)` manual, including `-R` remote forwarding syntax and bind-address behavior: https://man.openbsd.org/ssh
- OpenSSH `sshd(8)` manual, including `-t` and `-T` configuration test modes: https://man.openbsd.org/sshd
- Netfilter iptables documentation/HOWTO for TCP `--destination-port` / `--dport` matching: https://www.netfilter.org/documentation/HOWTO/NAT-HOWTO-5.html
- Local OpenSSH 9.6p1 `sshd -T` check for `GatewayPorts`, `AllowTcpForwarding`, `PermitListen`, `PermitTTY`, and `X11Forwarding` option parsing.
- Local `iptables` 1.8.10 help output for `-A`, `-p`, `-s`, `--dport`, and `-j` syntax.
- Local `ss` help output for `-tlnp` syntax.

## Issues Found
- The post described the default remote-forward bind address as only `127.0.0.1`. OpenSSH documents this as the server loopback interface, with `127.0.0.1` as the IPv4 case. I updated the introduction, table, client example, and verification notes to use loopback wording while keeping the IPv4 clarification.
- The `sshd_config` snippet showed `GatewayPorts yes` and `GatewayPorts clientspecified` both enabled. Because `sshd_config` uses the first obtained value for most keywords, this could make the recommended `clientspecified` setting ineffective. I changed the example to explicitly choose one option and commented out `GatewayPorts yes`.
- The related forwarding setting used `PermitOpen any`, which controls forwarding destinations. For remote forwarding listen addresses/ports, OpenSSH documents `PermitListen`. I replaced it with `PermitListen any`.
- The `PermitTTY no` comment said "No shell for this user." OpenSSH documents `PermitTTY` as controlling pseudo-terminal allocation, not shell access. I changed the comment to "No pseudo-TTY allocation."
- The firewall guidance implied firewall rules are always required. I changed the wording to say externally reachable forwards may need firewall rules, and the conclusion now says firewall rules should allow only the intended sources.

## Review Notes
The corrected OpenSSH directives parse successfully with the local OpenSSH 9.6p1 `sshd -T` command when supplied a temporary host key. I did not run a live remote-forwarding session against a real server. In a future hardening pass, the examples could consider `AllowTcpForwarding remote`, tighter `PermitListen` values, and service-name caveats such as `sshd` versus `ssh` on different Linux distributions.
