# Validation Summary: How to Deploy Strapi CMS via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Strapi 5
- Portainer
- Docker Compose
- Docker images
- PostgreSQL
- Nginx
- Node.js
- REST API
- GraphQL

## Sources Consulted
- Strapi Docker documentation: https://docs.strapi.io/cms/installation/docker
- Strapi CLI installation documentation: https://docs.strapi.io/cms/installation/cli
- Strapi deployment documentation: https://docs.strapi.io/cms/deployment
- Strapi CLI reference: https://docs.strapi.io/cms/cli
- Strapi GraphQL API documentation: https://docs.strapi.io/cms/api/graphql
- Strapi environment variables documentation: https://docs.strapi.io/cms/configurations/environment
- Strapi database configuration documentation: https://docs.strapi.io/cms/configurations/database
- Strapi server configuration documentation: https://docs.strapi.io/cms/configurations/server
- Archived official Strapi Docker repository noting `strapi/strapi` is for Strapi v3 only: https://github.com/strapi/strapi-docker
- Docker Compose services reference (`depends_on`, health checks, Compose labels): https://docs.docker.com/reference/compose-file/services/
- Docker Compose exec reference: https://docs.docker.com/compose/reference/exec
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer FAQ on Compose builds from Git: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git
- Portainer known issue for Compose `build` directives on remote environments: https://docs.portainer.io/2.33-lts/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Nginx official Docker image tags: https://hub.docker.com/_/nginx

## Issues Found
- The post used `strapi/strapi:latest` as if it were a current official Strapi image. This is incorrect for Strapi 5. I replaced that flow with a custom `Dockerfile.prod` plus a registry-backed image referenced by Portainer because Strapi’s current docs explicitly say there is no official Strapi container image, and the archived `strapi/strapi` image is for Strapi v3 only.
- The original stack implied Strapi could be deployed directly with no project build step. That was incomplete. I added the prerequisite to create a Strapi project first and to choose PostgreSQL during project creation so the `pg` dependency is installed before the production image is built.
- The post claimed Strapi auto-generates both REST and GraphQL APIs. That is inaccurate for current Strapi. I corrected the description, introduction, API section, and summary to state that REST is available by default and GraphQL requires installing `@strapi/plugin-graphql`.
- The admin panel section said readers could define content types after deploying the production stack. In current Strapi, `strapi start` is the production command and the Content-Type Builder is disabled in that mode. I corrected the section to say content types must already exist before building the image, or be changed in code and redeployed.
- The PostgreSQL backup command hard-coded a container name that would vary by stack/project naming. I replaced it with a label-based container lookup and kept the backup command aligned with Docker’s Compose labeling behavior.
- The uploads backup command archived `/uploads` as an absolute path. I changed it to archive the directory relative to `/` using `tar -C / uploads`, which is safer for restore workflows.
- The Nginx example was incomplete for an SSL server block and used an outdated pinned image tag. I updated it to `nginx:stable-alpine`, mounted the config as `default.conf`, added certificate directives, and added the forwarded proxy headers required for a normal reverse proxy setup.
- The database health check was overly loose and the Docker-specific pool minimum setting was missing. I updated the health check to target the Strapi database explicitly and added `DATABASE_POOL_MIN=0`, matching Strapi’s Docker guidance for database pooling.

## Review Notes
- Docker is not installed in this workspace, so I could not execute the Compose or Nginx examples locally. Validation was done against current official documentation, Strapi CLI help output, and a locally scaffolded Strapi project structure created with the current `create-strapi` CLI.
