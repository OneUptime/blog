# Validation Summary: Portainer vs Coolify: Self-Hosted PaaS Comparison

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Portainer
- Coolify
- Docker
- Docker Compose
- Kubernetes
- Nixpacks
- Let's Encrypt

## Sources Consulted
- Portainer documentation overview: https://docs.portainer.io/
- Portainer stack deployment from Git: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Edge Agent / edge feature rationale: https://docs.portainer.io/faqs/getting-started/why-do-we-recommend-using-the-edge-agent-instead-of-the-traditional-agent
- Coolify documentation overview: https://coolify.io/docs
- Coolify applications overview: https://coolify.io/docs/applications/
- Coolify build packs overview: https://coolify.io/docs/builds/packs/overview
- Coolify Docker Compose build pack: https://coolify.io/docs/applications/build-packs/docker-compose
- Coolify databases overview: https://coolify.io/docs/databases/
- Coolify domains and HTTPS: https://coolify.io/docs/knowledge-base/domains
- Coolify environment variables: https://coolify.io/docs/knowledge-base/environment-variables
- Coolify database backups: https://coolify.io/docs/databases/backups
- Docker Compose `version` / `name` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose deploy reference: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The Portainer Git deployment row was too narrow. Portainer supports deploying stacks directly from Git repositories, and automatic updates can poll Git; stack webhooks are a Business Edition feature. I corrected the comparison table to reflect that.
- The Coolify Kubernetes row was inaccurate. Current Coolify documentation says Docker Swarm is supported and Kubernetes is "coming soon", so I changed the table from "Limited" to "No (K8s coming soon)".
- The Portainer SSL and custom domain rows were too absolute. I changed them from "No" to "Not built-in" because Portainer does not provide first-class app-domain and Let's Encrypt management, even though those concerns can be handled with external reverse proxies.
- The Coolify database bullets overstated what is automatic. I rewrote them to state that the databases are available as one-click resources, backups can be configured, and connection details are surfaced in the UI.
- The Docker Compose sample used the obsolete top-level `version` field and referenced an undeclared custom network. I removed `version`, declared `networks`, and kept the rest aligned with the current Compose references.

## Review Notes
- Portainer webhook behavior is edition-specific, and the post now reflects that distinction.
- The local review environment did not have `docker` installed, so the Compose snippet was checked against Docker's current specification and reference docs rather than `docker compose config`.
- Coolify's backup documentation is somewhat uneven between the narrative docs and API/reference pages, so the post now uses conservative wording that remains accurate across the current official documentation.
