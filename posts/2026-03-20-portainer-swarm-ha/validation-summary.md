# Validation Summary: How to Set Up Docker Swarm High Availability with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Swarm
- Docker Engine CLI
- Portainer CE
- NGINX
- Raft consensus

## Sources Consulted
- Docker Docs: `docker swarm init` https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: `docker swarm join` https://docs.docker.com/reference/cli/docker/swarm/join/
- Docker Docs: `docker node inspect` https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker Docs: How nodes work https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/
- Docker Docs: Administer and maintain a swarm of Docker Engines https://docs.docker.com/engine/swarm/admin_guide/
- Docker Docs: Drain a node on the swarm https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Portainer Docs: Install Portainer CE with Docker Swarm on Linux https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer Docs: How can I ensure Portainer's configuration is retained? https://docs.portainer.io/faqs/installing/how-can-i-ensure-portainers-configuration-is-retained
- Portainer Docs: Using Portainer with reverse proxies https://docs.portainer.io/advanced/reverse-proxy
- Portainer official CE LTS Swarm stack manifest https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml

## Issues Found
- The post described the Portainer deployment as highly available, but Portainer's standard Docker Swarm deployment is a single Portainer Server service. I updated the description, introduction, Step 4, Step 5, and the conclusion so the post now accurately distinguishes Swarm control-plane HA from the Portainer Server deployment model.
- The Portainer stack example did not match the current official Swarm deployment guidance. I changed the images from `:latest` to `:lts`, added the published `9443` port from the official manifest, removed the outdated extra agent configuration from the snippet, and kept the Portainer service pinned to a specific manager so its local data volume does not appear as a fresh install after rescheduling in a multi-manager swarm.
- The verification command used `docker node inspect manager1 --format '{{.ManagerStatus}}'` while describing it as a Raft status check. I changed it to `{{ .ManagerStatus.Reachability }}` to match Docker's documented manager reachability check.
- The manager-draining step drained every manager, which would unschedule service workloads from all drained nodes and conflict with running Portainer on a manager. I corrected the step to drain only the managers that are not hosting Portainer and clarified why.
- The failover test stopped `manager1`, which the revised Portainer deployment pins as the Portainer host. I changed the test to stop `manager2` so the Swarm HA example remains consistent with the Portainer placement guidance.
- The HA architecture section used an absolute claim that worker nodes have "No limit". I changed that wording to "Add as needed for running workloads" to avoid an unqualified scalability claim.

## Review Notes
- Portainer's current CE install docs for Docker Swarm assume a single manager for the standard deployment and explicitly point multi-manager users to the configuration-retention guidance. The post is now accurate for that documented setup.
- The load balancer example still targets Portainer's HTTP port `9000`, which is valid and consistent with Portainer's reverse-proxy examples, but modern Portainer releases expose the HTTPS UI on `9443` by default and HTTP can be disabled later if desired.
