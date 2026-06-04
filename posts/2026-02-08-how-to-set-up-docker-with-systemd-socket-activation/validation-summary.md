# Validation Summary: How to Set Up Docker with Systemd Socket Activation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker daemon (`dockerd`)
- systemd service units
- systemd socket units
- systemd timer units
- Linux Unix sockets and TCP sockets
- Docker TLS remote access

## Sources Consulted
- Docker Docs: `dockerd` CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Configure remote access for Docker daemon - https://docs.docker.com/engine/daemon/remote-access/
- Docker Docs: Protect the Docker daemon socket - https://docs.docker.com/engine/security/protect-access/
- systemd.socket manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.socket.html
- Local `systemd.service(5)`, `systemd.socket(5)`, `systemd.timer(5)`, and `systemd.unit(5)` man pages
- Local Docker CLI help for Docker 29.4.2: `docker --help`, `dockerd --help`, and `docker events --help`

## Issues Found
- The post originally said Docker starts on demand and stops after a period of inactivity. Docker supports socket activation through `dockerd -H fd://`, but it does not stop itself when idle. Updated the introduction, workflow explanation, and diagram to state that idle stopping requires an additional mechanism.
- The post implied Docker can stop itself when idle after systemd hands off the connection. Updated this to say the daemon keeps running until stopped.
- The post said `StopWhenUnneeded` can configure an idle timeout. `StopWhenUnneeded` is dependency-based, not an activity timer. Updated the text to clarify that an idle timeout requires a wrapper approach.
- The post did not mention the `dockerd -H fd://` service precondition for systemd socket activation. Added a short note that the service must be configured for socket activation, which is the standard package configuration on systemd-based Docker installs.
- The socket drop-in examples restarted only `docker.socket`. Because a running `docker.service` receives socket file descriptors at service start, updated the examples to stop `docker.service` before restarting `docker.socket` so the new socket configuration is used on the next activation.
- The unauthenticated TCP warning understated the risk. Updated it to match Docker's security guidance that remote unauthenticated Docker API access can grant root-level control of the host.

## Review Notes
The examples are technically valid for standard Docker Engine packages that use `dockerd -H fd://` with `docker.socket`. Administrators should avoid stopping `docker.service` while important containers are running unless they have planned for the impact.
