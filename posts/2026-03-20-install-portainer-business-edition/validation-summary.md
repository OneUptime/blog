# Validation Summary: How to Install Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Community Edition
- Docker Engine
- Docker CLI

## Sources Consulted
- Portainer install docs for Docker Standalone (Linux): https://docs.portainer.io/start/install/server/docker/linux
- Portainer initial setup docs: https://docs.portainer.io/start/install/server/setup
- Portainer licensing docs: https://docs.portainer.io/admin/licenses
- Portainer upgrade-to-BE docs: https://docs.portainer.io/start/upgrade/tobe
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Portainer authentication docs: https://docs.portainer.io/admin/settings/authentication
- Portainer CE vs BE comparison article: https://www.portainer.io/blog/portainer-community-edition-ce-vs-portainer-business-edition-be-whats-the-difference
- Portainer pricing page: https://www.portainer.io/business-enterprise-it-pricing
- Portainer get started page: https://www.portainer.io/resources/get-started
- Docker CLI reference for `docker run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference for `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/

## Issues Found
- The post said Portainer BE was free for up to 5 nodes. Current Portainer documentation and pricing pages now advertise 3 nodes free, so this was updated in the prerequisites and comparison table.
- The introduction implied OAuth authentication itself was a BE-only differentiator. Current Portainer materials show OAuth and LDAP are available more broadly, while BE adds enhanced OAuth support and Active Directory support, so the wording and comparison table were corrected.
- The support comparison said BE support was dedicated. Current Portainer pricing and lifecycle docs show free BE offerings receive community support, while commercial plans receive commercial support, so the support wording was corrected.
- The setup step said to click **Activate** after entering the license. Current Portainer setup documentation says the action is **Submit**, so this was corrected.
- The verification step said to navigate to **Settings > Licenses**. Current Portainer docs expose **Licenses** as its own admin section, so this was corrected.
- The login step implied `https://localhost:9443` was always the right address. Portainer's install docs note that `localhost` should be replaced with the server IP or FQDN when appropriate, so that clarification was added.
- The prerequisites listed only port `9443`, while the example command also publishes port `8000`. Portainer docs state `8000` is optional and used for Edge agents, so that prerequisite and step text were clarified.

## Review Notes
- The `docker volume create`, `docker run`, and `docker ps --format` commands are syntactically valid.
- The post uses `portainer/portainer-ee:latest`. This tag is currently active, but Portainer documentation also distinguishes between `STS` and `LTS` release streams and recommends `LTS` for production workloads.
