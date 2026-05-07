# Validation Summary: How to Use Podman for Self-Hosted Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Gitea
- Linkding
- Outline
- Planka
- FreshRSS
- Uptime Kuma
- Mealie
- Shlink
- PostgreSQL
- Redis

## Sources Consulted
- Podman `podman-create`: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-pod-create`: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman volume options: https://docs.podman.io/en/latest/markdown/options/volume.html
- Podman `podman-auto-update`: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman Quadlet / systemd units: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Quadlet basic usage: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Gitea Docker install docs: https://docs.gitea.com/1.22/installation/install-with-docker
- Gitea rootless Docker docs: https://docs.gitea.com/installation/install-with-docker-rootless
- Linkding installation: https://linkding.link/installation/
- Linkding options: https://linkding.link/options/
- Outline official environment sample: https://raw.githubusercontent.com/outline/outline/main/.env.sample
- Outline repository: https://github.com/outline/outline
- PLANKA admin user docs: https://docs.planka.cloud/docs/configuration/admin-user
- PLANKA official `docker-compose.yml`: https://raw.githubusercontent.com/plankanban/planka/master/docker-compose.yml
- FreshRSS Docker README: https://raw.githubusercontent.com/FreshRSS/FreshRSS/edge/Docker/README.md
- FreshRSS feed update docs: https://freshrss.github.io/FreshRSS/en/admins/08_FeedUpdates.html
- Uptime Kuma README: https://raw.githubusercontent.com/louislam/uptime-kuma/master/README.md
- Mealie installation checklist: https://docs.mealie.io/documentation/getting-started/installation/installation-checklist/
- Mealie backend configuration: https://docs.mealie.io/documentation/getting-started/installation/backend-config/
- Mealie SQLite install example: https://docs.mealie.io/documentation/getting-started/installation/sqlite/
- Shlink Docker install docs: https://shlink.io/documentation/install-docker-image/
- Shlink environment variables: https://shlink.io/documentation/environment-variables/

## Issues Found
- The original Podman rootless/systemd explanation overstated what rootless mode guarantees and how Quadlet handles startup. I corrected the wording to match the Podman documentation.
- The Linkding example lacked initial user creation. I added `LD_SUPERUSER_NAME` and `LD_SUPERUSER_PASSWORD` and clarified how to log in.
- The Outline example omitted required self-hosting settings. I added `PGSSLMODE=disable` for a local Postgres connection, explicit local file storage settings, `FORCE_HTTPS=false` for the localhost URL, and an OIDC example because Outline requires at least one sign-in method to be configured.
- The Planka example used outdated persistence paths. I replaced the split avatar and attachment mounts with the current `/app/data` mount used by the official deployment example.
- The Uptime Kuma example used an unpinned `latest` tag. I updated it to the documented `:2` image tag and added the documented restart policy.
- The Mealie example was missing `BASE_URL`, which the official installation docs require for correct generated URLs and notifications. I added it.
- The Shlink example did not provide a first API key. I added `INITIAL_API_KEY` and clarified how to generate a key later from the container CLI.
- The automatic update example was incorrect because it recreated `gitea-app` with the same name and implied `podman auto-update` works for arbitrary standalone containers. I removed that command and clarified that auto-updates depend on systemd-managed services such as Quadlet units.

## Review Notes
- Several examples still use floating tags such as `latest` or `stable`. These are valid, but pinning explicit versions is safer for reproducible self-hosted deployments.
- The examples reuse common host ports such as `3000` and `8080`; they are intended to be run individually, not all at once on the same host.
- For rootless user services that must start before login, some systems may also require enabling lingering for the user account.
