# Validation Summary: How to Fix Edge Agent Not Connecting to Portainer Server - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Docker
- Bash
- Linux time synchronization utilities

## Sources Consulted
- Portainer Documentation: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer Documentation: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Documentation: Troubleshooting Edge Agent Connection Issues - https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/troubleshooting-edge-agent-connection-issues
- Portainer Documentation: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer Documentation: CLI configuration options - https://docs.portainer.io/sts/advanced/cli
- Portainer Agent repository README - https://github.com/portainer/agent
- Docker Docs: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker logs` - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: `docker run` - https://docs.docker.com/reference/cli/docker/container/run/
- timedatectl(1) - https://man7.org/linux/man-pages/man1/timedatectl.1.html

## Issues Found
- The connectivity explanation implied that the Edge Agent first connects to Portainer on port `8000`. I corrected this to match Portainer's documented flow: the agent polls the Portainer API/UI endpoint first and opens the reverse tunnel on the tunnel port only when needed.
- The Edge key recovery steps pointed readers to the wrong place in the Portainer UI. I updated them to use the environment details and **Edge information** section where Edge identifiers and key data are exposed.
- The deployment examples used `:latest` image tags. I changed these to version-matching placeholders because Portainer documents that the agent version should match the Portainer server version.
- The Portainer server recreate example had an inline shell comment after a line-continuation backslash, which breaks the command. I removed the inline comment so the command is valid shell syntax.
- The custom tunnel section used `--tunnel-addr=0.0.0.0` as though it configured the external address used by Edge Agents. I replaced this with a correct `--tunnel-port` example and clarified that the Edge key must be regenerated after changing the Portainer URL or tunnel port.
- The HTTPS connectivity test used `/api/status`, which was not the documented troubleshooting check I could verify in Portainer's docs. I replaced it with the documented `curl -v https://<server>:9443` test.
- The debug deployment example omitted the `/:/host` bind mount that Portainer includes in its documented Edge Agent deployment command. I restored that mount.
- The clock synchronization explanation overstated the issue by tying it to generic Edge Agent authentication. I narrowed it to the TLS certificate validation behavior that clock drift directly affects.

## Review Notes
- The post is now technically accurate for standard Edge Agent deployments. Async Edge Agent deployments behave differently and do not require the tunnel port to be open.
- `EDGE_INSECURE_POLL=1` is appropriate when the Portainer server uses a self-signed certificate. Deployments using publicly trusted certificates can omit it.
