# Validation Summary: How to Fix Edge Agent Not Connecting to Portainer Server

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer Server
- Portainer Edge Agent
- Docker CLI
- Network connectivity troubleshooting with `curl` and `nc`

## Sources Consulted
- Portainer Documentation, "The Portainer Edge Agent" - https://docs.portainer.io/advanced/edge-agent
- Portainer Documentation, "Install Edge Agent Standard on Docker Standalone" - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Documentation, "Troubleshooting Edge Agent Connection Issues" - https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/troubleshooting-edge-agent-connection-issues
- Portainer Documentation, "Install Portainer CE with Docker on Linux" - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer Documentation, "CLI configuration options" - https://docs.portainer.io/advanced/cli
- Docker Docs, "docker container run" - https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs, "docker container logs" - https://docs.docker.com/reference/cli/docker/container/logs/
- curl Documentation, "How To Use" - https://curl.se/docs/manpage.html

## Issues Found
- The post originally described Edge Agent connectivity as only requiring port `8000`. Portainer's official documentation requires both `9443` for polling/API access and `8000` for the reverse tunnel, so the explanation and diagram were corrected.
- The original Edge key description was incomplete and said failures were "silent". The Edge key also contains the tunnel fingerprint and environment ID, and a bad key prevents association rather than silently succeeding, so that wording was corrected.
- The Portainer server `docker run` example had invalid shell syntax because a trailing backslash was followed by an inline comment. It also used `portainer/portainer-ce:latest` instead of Portainer's documented `:lts` tag. The command was corrected to a valid, current deployment example.
- The firewall troubleshooting step only instructed opening port `8000`. It was updated to test and require both `9443` and `8000`, and to note the `EDGE_INSECURE_POLL=1` requirement for self-signed TLS deployments.
- The proxy example was not a valid Edge Agent deployment command and could mislead readers into running an incomplete container definition. It was replaced with accurate proxy troubleshooting guidance instead of an unsupported deployment snippet.
- The original log examples used specific success strings that were not documented in Portainer's official docs. They were replaced with generic but accurate log and heartbeat verification guidance.

## Review Notes
- If the Portainer server was started with a custom `AGENT_SECRET`, the same `AGENT_SECRET` must also be provided to the Edge Agent. Portainer documents this requirement on the Edge Agent installation page, but the post does not currently cover that scenario.
