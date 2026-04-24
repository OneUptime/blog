# Validation Summary: How to Deploy Ghost Blog via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Portainer
- Docker Compose
- Ghost
- MySQL
- Traefik
- Mailgun

## Sources Consulted
- Ghost configuration reference: https://docs.ghost.org/config
- Ghost Docker installation docs: https://docs.ghost.org/install/docker/
- Ghost members setup guide: https://ghost.org/help/setup-members/
- Ghost email newsletter setup guide: https://ghost.org/help/setup-email-newsletters/
- Ghost newsletter developer docs: https://ghost.org/docs/newsletters/
- Ghost theme installation guide: https://ghost.org/help/installing-a-theme/
- Ghost export guide: https://ghost.org/help/exports/
- Docker Compose file reference (`version` key): https://docs.docker.com/reference/compose-file/version-and-name/
- Ghost official Docker image page: https://hub.docker.com/_/ghost
- Traefik Docker provider reference: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
1. **Obsolete Compose file `version` key.** The post used `version: "3.8"`, which is obsolete in modern Docker Compose. I removed it so the stack matches current Compose guidance.
2. **Ghost image pinned to an outdated major tag.** The stack used `ghost:5-alpine` even though current official Ghost image tags are on Ghost 6. I updated the example to `ghost:6-alpine`.
3. **Newsletter delivery was conflated with SMTP mail transport.** The environment variables shown configure Ghost's standard SMTP transport for transactional mail, not self-hosted bulk newsletter sending. I corrected the text to explain that bulk newsletters on self-hosted Ghost require Mailgun API configuration in Ghost Admin.
4. **Ghost Admin navigation paths were outdated or imprecise.** I updated the membership, theme, and content export paths to match the current Ghost Admin UI.
5. **The Traefik example could select the wrong network and referenced an undeclared network.** Because the container is attached to both `default` and `traefik-public`, Traefik's docs recommend setting `traefik.docker.network`. I added that label and the external network declaration.
6. **The introduction overstated the base stack as production-ready.** Since the primary example exposes Ghost directly over HTTP, I softened that language to avoid implying the base stack alone is a full production hardening story.

## Review Notes
- The Docker/Portainer stack itself is valid for a Docker Standalone environment managed through Portainer. Users deploying to Docker Swarm through Portainer should expect differences because Swarm stack deployments do not behave the same way as `docker compose` for fields like `depends_on`.
- The post now correctly distinguishes transactional email from newsletter delivery, which is an important Ghost-specific behavior that often trips up self-hosters.
- The workspace did not have a local Docker CLI available, so runtime verification was documentation-based rather than executed against a live Docker engine.
