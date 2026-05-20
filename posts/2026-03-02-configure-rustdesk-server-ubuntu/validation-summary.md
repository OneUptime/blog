# Validation Summary: How to Configure RustDesk Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- RustDesk Server OSS
- hbbs and hbbr
- systemd
- UFW
- Docker and Docker Compose

## Sources Consulted
- RustDesk Server OSS documentation: https://rustdesk.com/docs/en/self-host/rustdesk-server-oss/
- RustDesk Server OSS installation documentation: https://rustdesk.com/docs/en/self-host/rustdesk-server-oss/install/
- RustDesk Server OSS Docker documentation: https://rustdesk.com/docs/en/self-host/rustdesk-server-oss/docker/
- RustDesk client configuration documentation: https://rustdesk.com/docs/en/self-host/client-configuration/
- RustDesk server GitHub releases/API: https://github.com/rustdesk/rustdesk-server/releases
- RustDesk server README: https://github.com/rustdesk/rustdesk-server
- Local `hbbs --help` and `hbbr --help` output from the current release archive.

## Issues Found
- The binary download example used outdated release archive names such as `rustdesk-server-linux-x86_64-unknown-linux-musl.zip`, which do not match current RustDesk Server OSS release assets. Updated the version to `1.1.15`, mapped Linux architectures to the current asset names (`amd64`, `arm64v8`), and added an unsupported-architecture guard.
- The ZIP extraction/install commands assumed `hbbs` and `hbbr` extracted into the current directory. Current archives place them under an architecture directory, so the snippet now extracts the binaries with `unzip -j` into a staging directory before installing them.
- The Docker Compose instructions used the legacy `docker-compose` command and a top-level `version` key. Updated the package and commands to Docker Compose v2 syntax (`docker compose`) and removed the obsolete `version` field.
- The security section described enabling TLS for relay connections, but the OSS client documentation describes using the server public key for encrypted self-hosted connections rather than enabling TLS in the shown configuration. Reworded the section to describe server-key encryption accurately.
- The troubleshooting note said hbbs needs to reach hbbr to register the relay address. Adjusted this to the user-visible requirement: hbbr must be running and clients must be able to reach the configured relay address on TCP 21117.
- The introductory traffic-routing claim implied all remote desktop traffic stays within the VPS. Clarified that peer discovery and relayed traffic use the self-hosted infrastructure, while direct peer-to-peer connections may not traverse the relay.

## Review Notes
The core architecture, default ports, systemd unit structure, UFW rules, public key location relative to the working/data directory, client configuration fields, and Docker host networking approach match RustDesk's official documentation. RustDesk's official installation documentation recommends Docker for most deployments; the manual binary flow remains valid after the archive-name and extraction fixes.
