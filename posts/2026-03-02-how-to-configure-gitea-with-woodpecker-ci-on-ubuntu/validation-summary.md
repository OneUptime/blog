# Validation Summary: How to Configure Gitea with Woodpecker CI on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Docker and Docker Compose
- Woodpecker CI server, agent, CLI, pipelines, secrets, and plugins
- Gitea OAuth and container registry
- Nginx reverse proxy
- Certbot/Let's Encrypt

## Sources Consulted
- Woodpecker CI Gitea forge configuration: https://woodpecker-ci.org/docs/administration/configuration/forges/gitea
- Woodpecker CI Docker Compose installation: https://woodpecker-ci.org/docs/3.13/administration/installation/docker-compose
- Woodpecker CI server configuration and Nginx reverse proxy notes: https://woodpecker-ci.org/docs/administration/configuration/server
- Woodpecker CI agent configuration: https://woodpecker-ci.org/docs/administration/configuration/agent
- Woodpecker CI workflow syntax: https://woodpecker-ci.org/docs/usage/workflow-syntax
- Woodpecker CI environment variables and string substitution: https://woodpecker-ci.org/docs/usage/environment
- Woodpecker CI CLI reference: https://woodpecker-ci.org/docs/cli
- Woodpecker CI Docker Buildx plugin reference: https://woodpecker-ci.org/plugins/docker-buildx
- Gitea container registry documentation: https://docs.gitea.com/usage/packages/container
- Docker Compose file reference for obsolete top-level version property: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post described creating a separate Gitea service account and access token for Woodpecker webhook/API operations, but the standard Woodpecker Gitea integration uses OAuth and the activating user's permissions. Rewrote that section to match Woodpecker's documented Gitea OAuth flow.
- The Docker Compose example used the obsolete top-level `version` property and unpinned `latest` images. Removed `version`, switched the Woodpecker images to the current `v3` release line, added the documented agent `command: agent`, and added an agent config volume so agent registration state persists.
- The shared secret example used `openssl rand -hex 16`; Woodpecker documents `openssl rand -hex 32`. Updated the command.
- The compose example included `WOODPECKER_SESSION_SECRET`, which is not a documented current Woodpecker server setting. Removed it.
- The reverse proxy commands ran Certbot after installing an SSL Nginx configuration that already referenced certificate files. Moved certificate issuance before writing/enabling the SSL server block.
- The startup and deployment examples used the legacy `docker-compose` command. Updated them to Docker Compose v2's `docker compose`.
- The pipeline examples used the old `when` object form for step conditions. Updated step-level conditions to the documented list-of-conditions form.
- The deploy step used `alpine/ssh`, which is not a standard Alpine image. Changed it to `alpine:3.20` and installed `openssh-client` in the step.
- The parallel-steps section used `group`, which is not the current Woodpecker mechanism for parallel execution. Replaced it with `depends_on` based on current workflow syntax.
- The Woodpecker CLI examples used `woodpecker secret ...`, but the installed binary is `woodpecker-cli` and repository/organization secrets are managed under `repo secret` and `org secret`. Updated the commands accordingly.
- The caching section stated that Woodpecker directly supports caching. Adjusted the wording to say compatible cache plugins can be used.

## Review Notes
The Docker Buildx example may require trusted/privileged plugin configuration depending on the Woodpecker instance policy and repository trust settings. The post remains technically valid as a compact setup guide, but production deployments should avoid long-lived `latest` plugin tags and should review plugin privilege settings carefully.
