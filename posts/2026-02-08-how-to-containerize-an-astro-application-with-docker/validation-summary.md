# Validation Summary: How to Containerize an Astro Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Astro
- Docker
- Dockerfile multi-stage builds
- Docker Compose
- Nginx
- Node.js
- PostgreSQL Docker image health checks

## Sources Consulted
- Astro Node adapter documentation: https://docs.astro.build/en/guides/integrations-guide/node/
- Astro v5 upgrade guide: https://docs.astro.build/en/guides/upgrade-to/v5/
- Astro routing reference: https://docs.astro.build/en/reference/routing-reference/
- Astro environment variables documentation: https://docs.astro.build/en/guides/environment-variables/
- Astro pages and Markdown documentation: https://docs.astro.build/en/basics/astro-pages/
- Dockerfile reference: https://docs.docker.com/reference/builder/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- NGINX Docker documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/
- BusyBox wget help output for Alpine-compatible wget flags.

## Issues Found
- Astro's `output: 'hybrid'` mode was removed in Astro 5. Updated the section to describe static mode with on-demand routes, removed the invalid `output: 'hybrid'` config, and kept the adapter requirement for server-rendered routes.
- The `.dockerignore` example excluded all `*.md` files, which can break Astro projects that use Markdown pages or content. Changed it to ignore only `README.md`.
- The PostgreSQL healthcheck used bare `pg_isready`, which can check the wrong default user/database depending on runtime context. Updated it to `pg_isready -U postgres -d astro_dev`.
- The Docker healthcheck examples used `wget --no-verbose --tries=1`, flags that are not supported by BusyBox `wget` commonly available in Alpine-based images. Replaced them with `wget -q --spider`.
- The image size comparison still referred to "Hybrid". Updated the label to "Static with on-demand routes".

## Review Notes
Image sizes are approximate and will vary with dependency count, base image version, and build output size. The SSR Dockerfile copies all `node_modules`, including development dependencies from `npm ci`; this is functional, but a future optimization could prune or install only production dependencies for the runtime image after verifying the Astro adapter's runtime requirements.
