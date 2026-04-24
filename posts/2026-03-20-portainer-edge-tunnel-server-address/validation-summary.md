# Validation Summary: How to Configure the Tunnel Server Address for Edge Agents - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Edge Agent
- Docker
- Docker Compose
- Nginx reverse proxy
- Traefik reverse proxy
- Python 3
- Base64-encoded Edge keys
- Network connectivity testing with `nc`

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- The Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Edge Compute settings: https://docs.portainer.io/admin/settings/edge
- Deploying Portainer behind nginx reverse proxy: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Deploying Portainer behind Traefik Proxy: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer server CLI source: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer edge key generation source: https://github.com/portainer/portainer/blob/develop/api/chisel/key.go
- Portainer edge URL parsing source: https://github.com/portainer/portainer/blob/develop/api/internal/edge/url.go
- Portainer agent edge key parsing source: https://github.com/portainer/agent/blob/develop/edge/key.go

## Issues Found
- The first `docker run` example had a shell syntax error because it placed an inline comment after a trailing line-continuation backslash. I removed the inline comment so the command is valid shell syntax.
- The post described `--tunnel-addr` as the public hostname Edge Agents use. Portainer's CLI docs and source show that `--tunnel-addr` configures the tunnel server bind/listen address, not the public address embedded in Edge configuration. I corrected the explanation and examples, and clarified that the public tunnel address is generated during Edge environment creation and is only directly overridable in Business Edition.
- The reverse proxy section claimed Nginx needed TCP passthrough and used a Traefik TCP `HostSNI` example. Portainer's official reverse-proxy documentation instead publishes port `8000` directly in the nginx example and uses a separate Traefik router/service for the Edge tunnel. I replaced both snippets to match the documented behavior.
- The Edge key inspection example incorrectly decoded the key as JSON and suggested looking for a `tunnelServerAddr` field. Portainer's agent source shows the Edge key is raw base64 without padding and decodes to `api_url|tunnel_addr|fingerprint|endpoint_id`. I replaced the example with a working Python decoder that prints the actual fields.
- The Docker connectivity test assumed another container could resolve `portainer` without joining the same Docker network. I changed the example to test from the Portainer container's network namespace instead.

## Review Notes
- Portainer documentation states that the custom Portainer tunnel server address field is only available in Portainer Business Edition. In Community Edition, the generated tunnel address is derived from the Portainer server URL and tunnel port.
- Portainer still requires the Portainer Server instance to expose the UI/API port and the Edge tunnel port for Edge Agent connectivity. The tunnel port defaults to `8000` but can be changed with `--tunnel-port`.
- Docker was not installed in the review environment, so container runtime verification was performed against Portainer's official documentation and upstream source rather than by launching the Portainer image locally.
