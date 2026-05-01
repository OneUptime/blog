# Validation Summary: How to Deploy n8n Workflow Automation via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- n8n
- Portainer
- Docker Compose
- PostgreSQL
- Slack
- OneUptime

## Sources Consulted
- n8n Docker installation: https://docs.n8n.io/hosting/installation/docker/
- n8n Docker Compose guide: https://docs.n8n.io/hosting/installation/server-setups/docker-compose/
- n8n deployment environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
- n8n database environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/database/
- n8n task runner environment variables: https://docs.n8n.io/hosting/configuration/environment-variables/task-runners/
- n8n self-hosted user management: https://docs.n8n.io/hosting/configuration/user-management-self-hosted/
- n8n webhook URL reverse proxy guidance: https://docs.n8n.io/hosting/configuration/configuration-examples/webhook-url/
- n8n monitoring docs: https://docs.n8n.io/hosting/logging-monitoring/monitoring/
- n8n Webhook node docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- n8n expressions docs: https://docs.n8n.io/data/expressions-for-transformation/
- n8n Slack credentials docs: https://docs.n8n.io/integrations/builtin/credentials/slack/
- n8n workflow publishing docs: https://docs.n8n.io/workflows/publish/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose specification: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The compose snippet used `N8N_BASIC_AUTH_*` variables, but n8n removed basic auth support in version 1.0. I removed those variables and updated the deployment instructions to create an owner account on first launch.
- The post used `n8nio/n8n:latest`, while current n8n Docker documentation uses the official `docker.n8n.io/n8nio/n8n` image. I updated the image reference to match current docs.
- The compose snippet omitted `N8N_RUNNERS_ENABLED`, but current n8n Python Code node support relies on task runners and the default is `false`. I enabled task runners in the example stack.
- The post mixed an HTTPS domain-based configuration with an `http://<host>:5678` access instruction. I updated the instructions to open the configured HTTPS hostname instead.
- The monitoring section claimed `/healthz` returns `{"status":"ok"}` and used it as the primary readiness signal. Current n8n docs only guarantee HTTP status for `/healthz`, and `/healthz/readiness` is the endpoint that verifies database readiness. I updated the monitor target and guidance accordingly.
- The compose snippet included the top-level `version` key, which Docker now marks as obsolete in the Compose Specification. I removed it.
- The workflow section told readers to activate the workflow. Current n8n documentation uses publishing for production webhook URLs, so I changed this to publish the workflow and aligned the wording around the production URL.
- The prerequisites and PostgreSQL explanation included overly specific claims that were not well-supported by current official documentation. I adjusted them to stay accurate without changing the scope of the post.

## Review Notes
- The example assumes a single reverse proxy in front of n8n because `N8N_PROXY_HOPS` is set to `1`. If readers deploy behind a different proxy chain, they should adjust that value accordingly.
- The post still uses placeholder passwords in the sample compose file. That is acceptable for a tutorial, but they must be replaced before real deployment.
