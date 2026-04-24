# Validation Summary: How to Troubleshoot Edge Agent Connection Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Docker CLI
- `curl`
- Python 3
- Linux networking tools (`nc`, `iptables`, `nslookup`)

## Sources Consulted
- Portainer Edge Agent documentation: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Troubleshooting Edge Agent Connection Issues: https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/troubleshooting-edge-agent-connection-issues
- Updating the Edge Agent: https://docs.portainer.io/start/upgrade/edge
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer agent source and README: https://github.com/portainer/agent
- Portainer server source: https://github.com/portainer/portainer
- Docker `docker container logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker `docker container exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker `docker run` / running containers reference: https://docs.docker.com/engine/containers/run/

## Issues Found
- The post incorrectly described `EDGE_KEY` as base64-encoded JSON containing credentials. Portainer’s official docs and source show it is raw base64 without padding for `portainer_api_url|tunnel_server_addr|tunnel_fingerprint|endpoint_id`. I replaced the decode example and the expected output.
- The original decode command used `base64 -d` directly on Portainer’s raw base64 key and then piped to `python3 -m json.tool`. That would not reliably work for Portainer Edge keys and the JSON formatting step was invalid. I replaced it with a Python decode example that handles Portainer’s no-padding format correctly.
- The post only tested port `8000` and suggested `docker exec ... nc ...` inside the agent container. Portainer requires reachability to both the Portainer API URL (usually `9443`) and the tunnel server (`8000`), and the agent image does not document `nc` availability. I changed the checks to host-side tests for both ports.
- The HTTPS verification step used `/api/system/version` without authentication. In current Portainer source this endpoint is authenticated-only, so the example was wrong as written. I changed it to the public `/api/system/status` endpoint.
- The “Regenerate the Edge Key” section implied key expiry and filtered endpoint types `[4, 7, 8]`. Current Portainer endpoint types relevant here are `4` and `7`, and the example actually retrieves the current Edge ID and key rather than regenerating them. I corrected the wording and the API filter.
- The redeploy command used an incomplete `docker run` example and `portainer/agent:latest`. Portainer’s official deployment and update docs require the standard bind mounts, restart policy, and a tag matched to the Portainer Server version/support channel. I replaced the command with the supported pattern and added the self-signed certificate and `AGENT_SECRET` caveats.
- Several error examples were overly generic or mismatched current Portainer behavior. I updated the error table to use errors and causes that better match Portainer’s documentation and source.

## Review Notes
- The examples assume the common direct-exposure ports `9443` and `8000`. If Portainer is behind a reverse proxy or custom port mapping, the post should use the API URL and tunnel address decoded from the Edge key.
- The firewall example is Linux and `iptables` specific. Systems using `nftables`, `firewalld`, host firewalls in cloud platforms, or network ACLs need equivalent checks.
- The API example uses `/api/auth` with username and password because it is technically valid, but Portainer’s API docs also support using an access token, which is usually preferable for operational workflows.
