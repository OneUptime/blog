# Validation Summary: How to Configure Portainer for Thousands of Containers - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Compose / Swarm stack configuration
- Portainer Edge Agent
- BoltDB / bbolt
- Go runtime memory tuning

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer General settings: https://docs.portainer.io/admin/settings/general
- Portainer Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Edge Agent overview: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Updating the Edge Agent: https://docs.portainer.io/start/upgrade/edge
- Portainer Services documentation: https://docs.portainer.io/user/docker/services
- Portainer Stacks documentation: https://docs.portainer.io/user/docker/stacks
- Docker `docker service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker `docker service ls` reference: https://docs.docker.com/reference/cli/docker/service/ls/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy reference: https://docs.docker.com/reference/compose-file/deploy/
- Go runtime environment variable reference: https://pkg.go.dev/runtime
- Go `runtime/debug` memory limit reference: https://pkg.go.dev/runtime/debug
- Official Portainer Agent repository README: https://github.com/portainer/agent

## Issues Found
- The Portainer config example used `--snapshot-interval=600`, but Portainer expects duration strings such as `10m`. I corrected the flag value to a valid duration.
- The config example used `--log-mode=file`, which is not a valid Portainer log mode. I removed the invalid flag instead of replacing it with an unsupported value.
- The hidden-container filter was configured as `--hide-label=maintenance`, but Portainer’s hide-label filter expects a key/value label match. I changed it to `--hide-label=com.portainer.hide=true` and aligned the label example with it.
- The `GOMEMLIMIT` comment described the setting as a hard memory limit. In Go, `GOMEMLIMIT` is a soft runtime memory limit, so I corrected the explanation.
- The server example exposed only port `9000`, which Portainer documents as a legacy HTTP port. I updated the example to expose `9443` and `8000`, matching current Portainer guidance and Edge Agent requirements.
- The BoltDB section treated `--compact-db` like a one-shot maintenance subcommand. Portainer documents it as a startup flag that compacts the database on startup, so I replaced the broken shell script with accurate maintenance-restart guidance.
- The “Filtering Containers from Snapshots” section was technically incorrect. Portainer’s hide-label feature hides containers in the UI; it does not exclude them from snapshots. I renamed and corrected that section.
- The hide-label command example was not a valid command. It referenced the image and flag without `docker run`. I replaced it with a valid Portainer startup example.
- The Edge Agent example used unsupported CLI flags such as `--edge`, `--edge-id`, `--edge-key`, and `--edge-checkin-interval`. Current Portainer guidance uses environment variables like `EDGE=1`, `EDGE_ID`, and `EDGE_KEY`, along with additional mounts and restart settings. I replaced the example with a current deployment command.
- The hardware section was framed as requirements even though the table is not published as an official Portainer sizing matrix. I retitled it as estimates and clarified the wording.

## Review Notes
- The hardware sizing table remains a practical heuristic rather than an official Portainer-published capacity guideline.
- If the Portainer Server is configured with a custom `AGENT_SECRET`, that same secret must also be passed to Agents and Edge Agents.
- `EDGE_INSECURE_POLL=1` is appropriate for Portainer’s default self-signed certificate setup; with a trusted certificate, it should be omitted.
