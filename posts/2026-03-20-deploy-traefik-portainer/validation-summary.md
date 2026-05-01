# Validation Summary: How to Deploy Traefik via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Traefik Proxy
- Docker Compose / Portainer stacks
- Docker networking
- Let's Encrypt ACME
- Apache `htpasswd`

## Sources Consulted
- Traefik, Getting Started with Docker and Traefik: https://doc.traefik.io/traefik/getting-started/docker/
- Traefik, Static Configuration CLI reference: https://doc.traefik.io/traefik/v3.3/reference/static-configuration/cli/
- Traefik, Dashboard documentation: https://doc.traefik.io/traefik/v3.3/operations/dashboard/
- Traefik, ACME / Let's Encrypt documentation: https://doc.traefik.io/traefik/v3.3/https/acme/
- Traefik, BasicAuth middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/basicauth/
- Traefik, Docker provider documentation: https://doc.traefik.io/traefik/v3.3/providers/docker/
- Docker Docs, Compose interpolation reference: https://docs.docker.com/reference/compose-file/interpolation/
- Portainer, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer, Inspect or edit a stack: https://docs.portainer.io/2.21/user/docker/stacks/edit
- Apache HTTP Server, `htpasswd` program reference: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html

## Issues Found
- The post used `--api.dashboard=true` as the only dashboard-related static flag. I changed this to `--api=true` because Traefik documents `--api` as the flag that enables the API/dashboard for secure dashboard routing.
- The stack enabled the file provider and mounted a `traefik_config` volume, but the post never created or used a dynamic configuration directory. I removed the unused file-provider flags and the unused config volume so the example does not point Traefik at a path the guide never initializes.
- The `acme.json` initialization step targeted `/var/lib/docker/volumes/traefik_traefik_data/_data/acme.json`, which depends on a volume path that only exists after deployment and on a specific Docker data-root/project naming layout. I changed ACME storage to a host bind mount at `/opt/traefik/data` and updated the initialization commands to match Traefik's documented `600` permission requirement.
- The dashboard password-hash example used an older MD5-style placeholder and a less precise generation command. I updated it to a bcrypt-based example and changed the command to `htpasswd -nbB ... | sed ...`, which matches Traefik's documented Docker Compose escaping guidance.
- The version example and upgrade step referenced `traefik:v3.0` and `traefik:v3.1`, which are outdated relative to the current official Traefik Docker getting-started guide. I updated the example image to `traefik:v3.6` and changed the upgrade step to instruct readers to move to a newer supported `v3.x` tag.

## Review Notes
- The guide assumes a Docker Standalone-style Portainer stack workflow. On Docker Swarm, some environment-variable behavior differs because Portainer ultimately uses `docker stack deploy`.
- The HTTPS example uses the HTTP-01 ACME challenge on port 80 while redirecting normal web traffic to HTTPS. Traefik documents that its ACME handling coexists with entrypoint redirects.
- No additional technical issues were found after these corrections.
