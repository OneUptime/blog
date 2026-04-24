# Validation Summary: Portainer vs Caprover: PaaS Comparison

## Status
validated

## Post Type
Guide / comparison

## Technologies Covered
- Portainer
- CapRover
- Docker
- Docker Swarm
- Kubernetes
- Docker Compose
- Let's Encrypt

## Sources Consulted
- Portainer documentation homepage: https://docs.portainer.io/
- Portainer CE install on Docker standalone (Linux): https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer environment groups and access: https://docs.portainer.io/admin/environments/groups
- Portainer stacks docs: https://docs.portainer.io/user/docker/stacks
- Portainer Edge Agent docs: https://docs.portainer.io/advanced/edge-agent
- Portainer GitHub repository: https://github.com/portainer/portainer
- CapRover homepage: https://caprover.com/
- CapRover getting started docs: https://caprover.com/docs/get-started.html
- CapRover Docker Compose docs: https://caprover.com/docs/docker-compose.html
- CapRover app scaling and cluster docs: https://caprover.com/docs/app-scaling-and-cluster.html
- CapRover app configuration docs: https://caprover.com/docs/app-configuration.html
- CapRover CLI docs: https://caprover.com/docs/cli-commands.html
- CapRover support docs: https://caprover.com/docs/support.html
- CapRover GitHub repository: https://github.com/caprover/caprover

## Issues Found
- The Portainer overview said Portainer provides a CLI for managing workloads. I changed this to GUI and API wording because the official docs expose an HTTP API and CLI configuration flags for the server, not a general workload-management CLI.
- The CapRover overview and feature table used placeholder values such as `Varies`, which left several technical differences unclear. I replaced them with source-backed specifics, including Docker Swarm-based operation, no Kubernetes support, single-cluster focus, partial Docker Compose support, and deployment via app tokens.
- The Portainer install snippet used `portainer/portainer-ce:latest`, exposed `9000`, and skipped the documented volume-creation step. I replaced it with the current official CE Docker install sequence using `docker volume create`, `9443`, `8000`, and `portainer/portainer-ce:sts`.
- The CapRover install snippet used a placeholder URL (`https://get-tool.example.com`) that would not work. I replaced it with the official `docker run` installation command from CapRover's getting started docs.
- The migration guidance was too generic to be technically safe. I tightened it to account for domains, environment variables, persistent data, routing, HTTPS, and port mappings when moving between the two tools.
- The conclusion treated the products as if they were the same kind of platform. I updated it to clarify that Portainer is broader container management software, while CapRover is a Docker Swarm-based self-hosted PaaS.

## Review Notes
- The post is now technically accurate, but the title still uses `PaaS` as a framing term even though Portainer is broader than a classic PaaS. The body now makes that distinction explicit.
- Portainer's published `8000` port is primarily for Edge Agent communication. It is part of the official install command, but it is only required if you plan to use Edge features.
- CapRover's documentation currently recommends Docker 25+ and a wildcard DNS/root-domain setup for standard internet-facing installations.
