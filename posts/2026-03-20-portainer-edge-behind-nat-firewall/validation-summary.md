# Validation Summary: How to Set Up Edge Agent Behind a NAT or Firewall - Portainer Behind

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Docker
- NAT
- Firewalls and reverse tunnel connectivity

## Sources Consulted
- Portainer Docs: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer Docs: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Docs: Troubleshooting Edge Agent Connection Issues - https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/troubleshooting-edge-agent-connection-issues
- Portainer Docs: CLI configuration options - https://docs.portainer.io/sts/advanced/cli
- Portainer Docs: Install Portainer CE with Docker on Linux - https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Docs: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer Docs: Install Edge Agent Async on Docker Standalone - https://docs.portainer.io/sts/admin/environments/add/docker/edge-async

## Issues Found
- The post stated that outbound port 443 is required for Portainer registration and API access. Portainer's default HTTPS/API port is 9443, with 443 only applying when Portainer is fronted by a reverse proxy. I corrected the requirements and connectivity check accordingly.
- The NAT diagram was fenced as `yaml` even though it is plain text, not valid YAML. I changed the fence to `text`.
- The Edge Agent `docker run` example omitted the persistent `/data` volume used for the Edge key, omitted the `/host` mount used in Portainer's documented command, and used a floating `latest` tag. I updated it to match Portainer's documented deployment pattern and added the self-signed certificate caveat.
- The firewall workaround used an invalid Docker example that attempted to bind host port 443 twice, which would fail. I replaced it with a documented Portainer server configuration that uses `--tunnel-port 443` and a matching published port.
- The post suggested manually changing `EDGE_KEY` to point to port 443. The tunnel address is part of the generated Edge configuration rather than something you should hand-edit in the article's form. I replaced this with an accurate explanation of using the reachable tunnel address, noting the Business Edition override path.
- The multi-layer NAT section assumed port 8000 unconditionally. I updated it to account for custom tunnel ports.

## Review Notes
- Portainer's default Edge Agent requirements are 9443 for the API/UI and 8000 for the reverse tunnel. If you move the tunnel to another port, the edge environment must be configured with that reachable address and port.
- Portainer recommends matching the Edge Agent image tag to the Portainer Server version.
- Portainer Edge Agent async mode removes the tunnel-port requirement, but Portainer documents async mode as a Business Edition feature.
