# Validation Summary: How to Run Mattermost in Docker for Team Chat

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Mattermost Team Edition
- Docker
- Docker Compose
- PostgreSQL
- mmctl
- Incoming webhooks
- Slash commands
- Flask
- Traefik

## Sources Consulted
- Mattermost Docker deployment documentation: https://docs.mattermost.com/deployment-guide/server/deploy-containers.html
- Mattermost official Docker repository: https://github.com/mattermost/docker
- Mattermost environment variables documentation: https://docs.mattermost.com/administration-guide/configure/environment-variables.html
- Mattermost environment configuration settings: https://docs.mattermost.com/administration-guide/configure/environment-configuration-settings.html
- Mattermost authentication configuration settings: https://docs.mattermost.com/configure/authentication-configuration-settings.html
- Mattermost integrations configuration settings: https://docs.mattermost.com/administration-guide/configure/integrations-configuration-settings.html
- Mattermost experimental Bleve configuration settings: https://docs.mattermost.com/administration-guide/configure/experimental-configuration-settings.html
- Mattermost mmctl command line tool documentation: https://docs.mattermost.com/administration-guide/manage/mmctl-command-line-tool.html
- Mattermost incoming webhooks documentation: https://docs.mattermost.com/integrations-guide/incoming-webhooks.html
- Mattermost slash commands documentation: https://docs.mattermost.com/integrations-guide/slash-commands.html
- Mattermost editions and offerings documentation: https://docs.mattermost.com/product-overview/editions-and-offerings.html
- Mattermost product limits documentation: https://docs.mattermost.com/administration-guide/manage/product-limits.html

## Issues Found
- The post described Team Edition as supporting unlimited users and message history. Updated this to match Mattermost's current positioning: Team Edition is free, self-hosted, and intended for small teams, hobbyists, or personal use under 250 activated users.
- The Docker Compose example used the `latest` Mattermost image tag while presenting the configuration as production-ready. Updated it to a pinned Mattermost Team Edition version, `11.7.1`, because Mattermost recommends specific version tags for production reproducibility.
- The Docker Compose example included the obsolete top-level `version` field. Removed it to align with the current Compose specification.
- The Compose example used low `pids_limit` values. Replaced those with `mem_limit` values because the official Docker deployment docs warn that low `pids_limit` values can prevent normal process/thread scaling and cause instability.
- The Compose example enabled Bleve indexing/search/autocomplete while targeting the current Mattermost v11 line, where Bleve is deprecated. Removed the enabling variables and left only the index directory mount for older versions that still use Bleve.
- The `mmctl` examples assumed unauthenticated command access from inside the container. Added `MM_SERVICESETTINGS_ENABLELOCALMODE=true` and changed the commands to use `mmctl --local`.
- The SMTP example supplied credentials without enabling SMTP authentication. Added `MM_EMAILSETTINGS_ENABLESMTPAUTH=true`.
- The rate limiting example used `MM_RATELIMITSETTINGS_ENABLE`, which does not match the current config key. Updated it to `MM_RATELIMITSETTINGS_ENABLERATELIMITER`.

## Review Notes
The Docker Compose example remains a simplified standalone deployment rather than Mattermost's full official Docker repository layout. For high availability or larger production deployments, Mattermost recommends Kubernetes or a supported HA architecture rather than a single Docker Compose stack.
