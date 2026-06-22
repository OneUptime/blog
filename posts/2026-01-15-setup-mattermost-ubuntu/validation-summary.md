# Validation Summary: How to Set Up Mattermost on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu Linux
- Mattermost Server
- PostgreSQL
- Nginx reverse proxy
- Let's Encrypt / Certbot
- systemd
- mmctl / Mattermost administration
- LDAP / Active Directory
- Mattermost plugins
- HAProxy
- Amazon S3-compatible storage
- Backup and restore shell scripts
- OneUptime monitoring

## Sources Consulted
- Mattermost Linux deployment documentation: https://docs.mattermost.com/deployment-guide/server/deploy-linux.html
- Mattermost tarball deployment documentation: https://docs.mattermost.com/deployment-guide/server/linux/deploy-tar.html
- Mattermost server preparation and database requirements: https://docs.mattermost.com/deployment-guide/server/preparations.html
- Mattermost software and hardware requirements: https://docs.mattermost.com/deployment-guide/software-hardware-requirements.html
- Mattermost configuration settings documentation: https://docs.mattermost.com/administration-guide/configure/configuration-settings.html
- Mattermost environment configuration settings: https://docs.mattermost.com/administration-guide/configure/environment-configuration-settings.html
- Mattermost plugins configuration settings: https://docs.mattermost.com/administration-guide/configure/plugins-configuration-settings.html
- Mattermost mmctl command reference: https://docs.mattermost.com/administration-guide/manage/mmctl-command-line-tool.html
- Mattermost legacy CLI documentation: https://docs.mattermost.com/administration-guide/manage/command-line-tools.html
- Mattermost Nginx proxy documentation: https://docs.mattermost.com/deployment-guide/server/setup-nginx-proxy.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Mattermost current config model source: https://github.com/mattermost/mattermost/blob/master/server/public/model/config.go

## Issues Found
- Updated database requirements from PostgreSQL 12+/MySQL 8.0+ to PostgreSQL 14+ and noted MySQL deprecation starting with Mattermost v11.
- Updated the Mattermost tarball example version from 9.11.0 to 11.8.1 to match current official documentation.
- Fixed PostgreSQL setup to use Mattermost's recommended UTF-8 database creation, database ownership, and PostgreSQL 15+ schema grants.
- Added a locale generation note for systems missing `en_US.UTF-8`.
- Clarified that commented config examples must have comments removed before being saved as `config.json`.
- Removed obsolete/unsupported Mattermost config keys including `EnableAPIv4`, `EnableTeamCreation`, `RestrictTeamInvite`, `EnableClusterAwareSearch`, and `AmazonS3IAM`.
- Fixed Mattermost config key casing from `MarketplaceUrl` to `MarketplaceURL` and `UseIpAddress` to `UseIPAddress`.
- Corrected the `EnableUserTypingMessages` explanation; it controls typing indicators, not user search.
- Replaced deprecated or invalid `mattermost` CLI examples with current `mmctl --local` commands for teams, channels, roles, and plugins.
- Removed an invalid `mattermost email test` command and directed readers to the System Console SMTP test.
- Adjusted systemd `PrivateTmp` so the default mmctl local-mode socket remains reachable.
- Added a warning that Nginx configuration referencing Let's Encrypt certificate files will fail before Certbot creates those files.
- Fixed the Active Directory LDAPS example to use `ConnectionSecurity: "TLS"` with port 636.
- Added missing `/opt/mattermost/scripts` directory creation before backup and restore script creation.
- Updated the restore script database recreation steps to preserve the same ownership and schema grants as the install flow.
- Replaced the invalid `mattermost config validate` troubleshooting command with `jq empty` for JSON syntax checking.
- Updated the PostgreSQL `pg_stat_statements` example from deprecated `total_time` to `total_exec_time` and noted that the extension must be enabled.

## Review Notes
The guide remains a broad production-oriented tutorial. Some operational areas, especially high availability, PostgreSQL replication, and backup/restore, are necessarily environment-specific and should still be tested in a staging environment before production use.
