# Validation Summary: How to Deploy Portainer and Traefik Together on Docker Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Swarm
- Docker stack / Compose v3 stack files
- Traefik Proxy
- Traefik ACME / Let's Encrypt
- Portainer CE
- Portainer Agent
- Reverse proxy routing with service labels

## Sources Consulted
- Docker Docs, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, "Manage swarm service networks": https://docs.docker.com/engine/swarm/networking/
- Traefik Docs, "Traefik & Docker Swarm" (v3.0): https://doc.traefik.io/traefik/v3.0/providers/swarm/
- Traefik Docs, "Routing Configuration for Swarm" (v3.3): https://doc.traefik.io/traefik/v3.3/routing/providers/swarm/
- Traefik Docs, "Dashboard" (v3.3): https://doc.traefik.io/traefik/v3.3/operations/dashboard/
- Traefik Docs, "ACME / Let's Encrypt" (v3.1): https://doc.traefik.io/traefik/v3.1/https/acme/
- Traefik Docs, "EntryPoints" (v3.4): https://doc.traefik.io/traefik/v3.4/routing/entrypoints/
- Portainer Docs, "Install Portainer CE with Docker Swarm on Linux": https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer Docs, "Install Portainer Agent on Docker Swarm": https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Docs, "Deploying Portainer behind Traefik Proxy": https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer Docs, "How can I ensure Portainer's configuration is retained?": https://docs.portainer.io/faqs/installing/how-can-i-ensure-portainers-configuration-is-retained

## Issues Found
- The post described the setup as "highly available", but the stack deploys a single Traefik replica and a single Portainer server replica. I changed the description, introduction, and conclusion to describe it as a cluster-aware Swarm setup instead of an HA deployment.
- The prerequisites said Traefik certificate storage could be "NFS, S3, or shared volume" and that DNS could point at the Swarm VIP. That was too broad for the posted configuration, which publishes ports in `host` mode and uses a single Traefik replica. I changed the prerequisites to require persistent data storage and to point DNS at the node running Traefik or a load balancer that forwards to that node, plus a note about pinning stateful services on multi-manager swarms.
- The dashboard secret created in Step 2 was unused, and the example value was not in Traefik BasicAuth `usersFile` format. I changed it to create a proper `admin:hash` secret and mounted it into Traefik with `basicauth.usersfile` so the example is internally consistent and matches Traefik's documented Swarm pattern.
- The Portainer server was configured to connect to `tcp://portainer-agent:9001`. Portainer's documented Swarm deployment uses the task DNS name (`tasks.<service>`) for the agent cluster. I changed the command to `tcp://tasks.portainer-agent:9001`.
- The post used `latest` tags for Portainer server and agent. I changed both to `lts` to match the current official installation guidance and to keep the agent and server version line consistent.
- The post created `portainer_data` implicitly as a stack-managed local volume while describing persistent storage requirements. I changed the walkthrough to create the volume explicitly and mark it as external, matching Portainer's documented deployment flow more closely.

## Review Notes
- `docker stack deploy` still uses the legacy Compose v3 stack format. The post's `version: "3.8"` files remain valid for Swarm stacks.
- Traefik OSS stores ACME data in `acme.json`; the official ACME docs note that this file must persist across restarts and should not be shared by multiple Traefik instances concurrently. Keeping `replicas: 1` for the Let's Encrypt-enabled Traefik service is the right constraint for this pattern.
- Portainer's current docs default to HTTPS on `9443`, but the official reverse-proxy examples still route Traefik to Portainer's internal HTTP service on `9000`, so that label was left as-is.
- Validation was done by doc review and static inspection. No live Swarm deployment was executed in this workspace.
