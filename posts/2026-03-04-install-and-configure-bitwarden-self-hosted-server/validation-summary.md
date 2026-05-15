# Validation Summary: How to Install and Configure Bitwarden Self-Hosted Server on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Bitwarden self-hosted server
- Docker Engine
- Docker Compose plugin
- firewalld
- Linux shell commands

## Sources Consulted
- Bitwarden Linux Standard Deployment: https://bitwarden.com/help/install-on-premise-linux/
- Bitwarden Self-host Bitwarden deployment options: https://bitwarden.com/help/self-host-bitwarden/
- Bitwarden Self-host FAQs: https://bitwarden.com/help/hosting-faqs/
- Docker Engine installation on RHEL: https://docs.docker.com/engine/install/rhel/
- firewalld firewall-cmd documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original post used generic placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, which would not install or configure Bitwarden. Replaced them with Bitwarden's Docker-based Linux deployment commands.
- The dependency installation was inaccurate for Bitwarden on RHEL. Replaced `epel-release` and `"Development Tools"` with Docker repository setup using `dnf-plugins-core` and Docker's RHEL repository.
- The package installation did not install the required Docker components. Replaced it with `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin`.
- The service setup incorrectly treated Bitwarden as a native systemd service. Replaced systemd service commands with the documented dedicated `bitwarden` user, `/opt/bitwarden` directory, `bitwarden.sh` installer, and `./bitwarden.sh start`.
- The configuration file path was wrong. Replaced it with `./bwdata/env/global.override.env`, where Bitwarden documents SMTP and other environment configuration.
- The verification and log commands were generic and invalid for Bitwarden. Replaced them with `docker ps` and `./bitwarden.sh compresslogs`.
- The firewall example used a nonexistent generic firewalld service name. Replaced it with `http` and `https`, matching Bitwarden's default ports 80 and 443.
- The monitoring commands targeted a nonexistent native service process. Replaced them with Docker container monitoring commands.

## Review Notes
The post is now technically aligned with the standard Bitwarden Linux deployment. Future improvements could add more detail about TLS certificate choices, SMTP examples, backups, updates, and SELinux/container policy considerations, but those additions were outside the scope of correcting the existing technical errors.
