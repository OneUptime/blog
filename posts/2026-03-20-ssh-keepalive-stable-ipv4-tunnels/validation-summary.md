# Validation Summary: How to Configure SSH KeepAlive Settings for Stable IPv4 Tunnels

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenSSH client configuration (`ssh_config`)
- OpenSSH server configuration (`sshd_config`)
- SSH local port forwarding and tunnels
- Linux TCP keepalive sysctl parameters
- Cloud NAT and load balancer idle timeout behavior

## Sources Consulted
- OpenBSD `ssh_config(5)` manual: https://man.openbsd.org/ssh_config.5
- OpenBSD `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenBSD `ssh(1)` manual: https://man.openbsd.org/ssh
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- AWS VPC NAT Gateway troubleshooting: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-troubleshooting.html
- Google Cloud NAT tuning documentation: https://docs.cloud.google.com/nat/docs/tune-nat-configuration
- Azure NAT Gateway resource documentation: https://learn.microsoft.com/en-in/azure/nat-gateway/nat-gateway-resource

## Issues Found
- The `ssh_config` example put `Host *` before `Host *-tunnel`. OpenSSH uses the first obtained value for each parameter, so the later tunnel-specific `ServerAliveInterval` and `ServerAliveCountMax` values would not override the global values. Moved `Host *-tunnel` before `Host *`.
- The post described SSH keepalives as periodic "null" packets and labeled them as `ServerAliveMessage`. OpenSSH documents `ServerAliveInterval` as sending a message through the encrypted channel to request a response. Updated the wording and diagram to "encrypted probe messages" and "server alive request."
- The post said AWS, GCP, and Azure cloud environments have a typical 5-minute NAT idle timeout. Official provider documentation shows AWS NAT Gateway uses 350 seconds, Azure NAT Gateway defaults to 4 minutes, and Google Cloud NAT defaults to 20 minutes for established TCP connections. Replaced the blanket 5-minute claim with provider-specific guidance.

## Review Notes
- `TCPKeepAlive yes` is technically valid but is already the OpenSSH default on both client and server; keeping it explicit is acceptable for a tutorial.
- `systemctl reload sshd` is valid on many Linux distributions, but the service name can be `ssh` on Debian and Ubuntu systems.
- The Linux sysctl parameters are Linux-specific; non-Linux systems use different TCP keepalive controls.
- Verified the corrected client config with `ssh -G`, the command-line forwarding options with `ssh -G`, and the server-side alive directives with `sshd -t` using a temporary host key.
