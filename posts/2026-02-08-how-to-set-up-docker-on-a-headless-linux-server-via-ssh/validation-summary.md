# Validation Summary: How to Set Up Docker on a Headless Linux Server via SSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose plugin
- Docker CLI contexts and SSH transport
- Docker daemon configuration
- Docker daemon TLS remote access
- Ubuntu apt repositories
- systemd
- UFW and iptables
- OpenSSH and scp
- tmux
- OpenSSL
- Watchtower

## Sources Consulted
- Docker Engine installation on Ubuntu: https://docs.docker.com/installation/ubuntulinux/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker `dockerd` CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Docker live restore documentation: https://docs.docker.com/engine/daemon/live-restore/
- Docker JSON file logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker contexts documentation: https://docs.docker.com/engine/manage-resources/contexts/
- Docker `context create` CLI reference: https://docs.docker.com/reference/cli/docker/context/create/
- Docker CLI reference for SSH daemon connections: https://docs.docker.com/reference/cli/docker/
- Docker remote daemon access documentation: https://docs.docker.com/engine/daemon/remote-access/
- Docker TLS daemon socket protection documentation: https://docs.docker.com/engine/security/protect-access/
- Docker packet filtering and firewalls documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker iptables documentation: https://docs.docker.com/engine/network/firewall-iptables/
- Docker daemon logs documentation: https://docs.docker.com/engine/daemon/logs/
- Docker Compose plugin installation documentation: https://docs.docker.com/compose/install/linux/
- Ubuntu Server firewall documentation: https://documentation.ubuntu.com/server/how-to/security/firewalls/
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `scp(1)` manual: https://man.openbsd.org/scp
- tmux getting started documentation: https://github.com/tmux/tmux/wiki/Getting-Started
- Watchtower usage and arguments documentation: https://containrrr.dev/watchtower/usage-overview/ and https://containrrr.dev/watchtower/arguments/

## Issues Found
- Docker convenience script guidance was too broad for a production server tutorial. Docker's official Ubuntu installation page says the convenience script is only recommended for testing and development environments. I changed the text to present it that way and direct production use to the manual repository setup.
- The Ubuntu apt repository command used an older one-line `.list` entry with `lsb_release -cs`. Docker's current official Ubuntu instructions use a deb822 `.sources` file and read the Ubuntu codename from `/etc/os-release`, which is more reliable on minimal headless installs. I updated the repository setup snippet accordingly.
- The non-root Docker access section omitted the security implication of the `docker` group. Docker documents that membership grants root-level privileges. I added a short warning before the `usermod` command.
- The Docker-over-TCP TLS section configured `hosts` in `/etc/docker/daemon.json` on an Ubuntu/systemd setup. Docker documents that this conflicts with systemd-provided `-H` startup options and can prevent the daemon from starting. I replaced that snippet with a systemd drop-in override using `dockerd -H fd:// -H tcp://0.0.0.0:2376` and TLS flags.
- The TLS daemon configuration pointed Docker at `/root/.docker/tls/...` even though the certificate generation commands created files in the current user's `~/.docker/tls`. I added commands to install the server certificates into `/etc/docker/tls` with appropriate permissions, and added a note that client certificates must be copied to the local machine before connecting.

## Review Notes
The remaining commands and configuration examples are technically valid for a current Ubuntu-based Docker Engine installation. The UFW section is accurate but intentionally cautious: Docker and UFW remain difficult to combine because Docker publishes container ports through firewall rules that can bypass normal UFW input policy. Watchtower remains a valid option, but auto-updating production containers should be evaluated per service because unattended image upgrades can still introduce application-level regressions.
