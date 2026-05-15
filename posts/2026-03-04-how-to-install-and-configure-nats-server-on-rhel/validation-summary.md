# Validation Summary: How to Install and Configure NATS Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- NATS Server
- NATS CLI
- systemd
- firewalld
- NATS HTTP monitoring

## Sources Consulted
- NATS Server configuration documentation: https://docs.nats.io/running-a-nats-service/configuration
- NATS authorization documentation: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/authorization
- NATS CLI documentation: https://docs.nats.io/using-nats/nats-tools/nats_cli
- NATS monitoring documentation: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS system account documentation: https://docs.nats.io/running-a-nats-service/configuration/sys_accounts
- NATS Core documentation: https://docs.nats.io/nats-concepts/core-nats
- NATS JetStream documentation: https://docs.nats.io/nats-concepts/jetstream
- NATS Server v2.10.11 GitHub release: https://github.com/nats-io/nats-server/releases/tag/v2.10.11
- NATS CLI v0.1.3 GitHub release: https://github.com/nats-io/natscli/releases/tag/v0.1.3

## Issues Found
- The NATS CLI download URL used a `.tar.gz` archive that does not exist for v0.1.3 Linux amd64. Changed it to the official `.zip` release asset and updated extraction to use `unzip`.
- The NATS CLI installation did not ensure the binary was executable after moving it. Added `chmod +x` for consistency with the server installation.
- The configuration comment labeled `default_permissions` as authentication, but it only sets authorization permissions. Renamed the comment to "Default permissions".
- `nats server info` does not work with the shown basic single-server configuration unless a system account is configured. Replaced it with the HTTP `/healthz` monitoring endpoint, which works with the documented `http_port` setup.

## Review Notes
The post pins older NATS Server and NATS CLI versions, but the commands are valid for those pinned versions after the fixes. The HTTP monitoring port is unauthenticated in NATS; exposing port 8222 through a firewall should be limited to trusted networks.
