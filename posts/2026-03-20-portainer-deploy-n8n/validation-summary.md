# Validation Summary: How to Deploy n8n Workflow Automation via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- n8n
- PostgreSQL
- JavaScript
- Slack
- Mattermost
- GitHub

## Sources Consulted
- n8n Docs, Docker installation: https://docs.n8n.io/hosting/installation/docker/
- n8n Docs, Docker Compose: https://docs.n8n.io/hosting/installation/server-setups/docker-compose/
- n8n Docs, Database environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/database/
- n8n Docs, Deployment environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
- n8n Docs, Endpoints environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/endpoints/
- n8n Docs, Configure self-hosted n8n for user management: https://docs.n8n.io/hosting/configuration/user-management-self-hosted/
- n8n Docs, Code node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/
- n8n Docs, How n8n structures data: https://docs.n8n.io/data/data-flow-nodes/
- n8n Docs, Install community nodes from npm in the n8n app: https://docs.n8n.io/integrations/community-nodes/installation/gui-install/
- n8n Docs, Manually install community nodes from npm: https://docs.n8n.io/integrations/community-nodes/installation/manual-install/
- n8n Docs, Execute Command: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executecommand/
- n8n Docs, Nodes environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/nodes/
- Docker Docs, Control startup order in Compose: https://docs.docker.com/compose/how-tos/startup-order/

## Issues Found
- The original compose file used basic-auth environment variables that are no longer supported. n8n removed basic auth and JWT in version 1.0, so I removed those variables and updated the setup instructions to the current owner-account flow.
- The original compose example set `N8N_PROTOCOL=https` and `WEBHOOK_URL` while the post instructed readers to access n8n directly on `http://<host>:5678`. I aligned the configuration with the documented direct HTTP setup.
- The post referred to the deprecated Function node and labeled a Code-node snippet as an API example. I updated both references to the current Code node terminology.
- The backup example used Execute Command as a generic backup step. In current n8n, Execute Command is disabled by default in v2 and runs inside the n8n container in Docker deployments, so I replaced the example with an SSH-based step.
- The community-node installation command was incorrect. I replaced it with the documented manual npm installation flow and kept the supported UI installation path.
- The conclusion used a brittle integrations count. I changed it to "Hundreds of built-in integrations" to match current official wording without pinning the post to a stale number.
- I updated the n8n image reference to the current official registry path used in the installation docs.

## Review Notes
- The compose snippet still contains placeholders such as `<host>`, database passwords, and `N8N_ENCRYPTION_KEY`; readers must replace these before deployment.
- This version of the post now clearly describes a direct `http://<host>:5678` deployment. If the post is later expanded for HTTPS behind a reverse proxy, it should also document `WEBHOOK_URL` and `N8N_PROXY_HOPS`.
