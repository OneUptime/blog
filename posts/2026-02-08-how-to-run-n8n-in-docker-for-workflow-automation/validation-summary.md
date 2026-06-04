# Validation Summary: How to Run n8n in Docker for Workflow Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- n8n
- Docker
- Docker Compose
- PostgreSQL
- Traefik
- Webhooks
- n8n CLI
- Shell commands
- JSON workflow exports

## Sources Consulted
- n8n Docker installation documentation: https://docs.n8n.io/hosting/installation/docker/
- n8n Docker Compose server setup documentation: https://docs.n8n.io/hosting/installation/server-setups/docker-compose/
- n8n database environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/database/
- n8n execution environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/executions/
- n8n deployment environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
- n8n logs environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/logs/
- n8n task runner documentation: https://docs.n8n.io/hosting/configuration/task-runners/
- n8n public API disabling guide: https://docs.n8n.io/hosting/securing/disable-public-api/
- n8n self-hosted user management documentation: https://docs.n8n.io/hosting/configuration/user-management-self-hosted/
- n8n CLI commands documentation: https://docs.n8n.io/hosting/cli-commands/
- n8n workflow export and import documentation: https://docs.n8n.io/workflows/export-import/
- n8n Webhook node documentation: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

## Issues Found
- The Docker examples used the older `n8nio/n8n` image reference and did not include current recommended Docker settings. Updated the examples to use `docker.n8n.io/n8nio/n8n`, use the `stable` tag in the production Compose file, and set `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` and `N8N_RUNNERS_ENABLED`.
- The workflow section said the workflow had three nodes but listed four. Corrected the count to four.
- The workflow JSON example was missing `connections` and `settings`, which are part of workflow JSON structures used for import/create operations. Added a connected JSON example for the health-check portion and included node `typeVersion` fields.
- The public API example said to disable the public API but set `N8N_PUBLIC_API_DISABLED` to `"false"`. Changed it to `"true"`.
- The environment-variable example included `N8N_USER_MANAGEMENT_DISABLED`, which was removed in n8n 1.0. Replaced it with `N8N_PERSONALIZATION_ENABLED` for a supported configuration example.
- The backup section implied workflows and credentials live in both PostgreSQL and the n8n data directory. Clarified that with PostgreSQL, workflows and credentials live in PostgreSQL, while the data directory still contains important instance files.
- The workflow export command used `--all --output` with a directory path. Updated it to use the documented backup export pattern with `--backup --output` and run the CLI as the `node` user inside the container.

## Review Notes
The Traefik labels and `WEBHOOK_URL` guidance are plausible for a minimal reverse-proxy setup. A fuller production deployment may also set host/protocol/editor URL variables depending on the proxy and deployment topology.
