# Validation Summary: How to Set Up Edge Agent Behind a NAT or Firewall

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Edge Agent
- Docker Standalone
- Windows Docker named-pipe mounts
- NAT, firewall traversal, TLS
- `curl` and the Portainer API

## Sources Consulted
- Portainer docs: Install Edge Agent Standard on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer docs: Install Edge Agent Async on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer docs: The Portainer Edge Agent — https://docs.portainer.io/advanced/edge-agent
- Portainer docs: Updating the Edge Agent — https://docs.portainer.io/start/upgrade/edge
- Portainer docs: Add an environment via the Portainer API — https://docs.portainer.io/admin/environments/add/api
- Portainer agent source: README deployment and Edge mode options — https://github.com/portainer/agent/blob/develop/README.md
- Portainer server source: edge environment creation handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer server source: generated Edge install commands for Linux and Windows — https://github.com/portainer/portainer/blob/develop/app/react/edge/components/EdgeScriptForm/scripts.ts

## Issues Found
- The networking explanation was inaccurate. The post said all Edge Agent traffic was outbound WSS to port `8000`, but Portainer documents standard mode as HTTPS polling to the API/UI port (`9443` by default) plus an on-demand TLS tunnel to `8000`, while async mode uses only the API/UI port. I corrected the diagram, description, and explanatory text.
- The API example for creating an Edge environment was not valid as written. Portainer’s endpoint creation handler expects `multipart/form-data`, and an Edge environment also needs a Portainer URL plus `ContainerEngine=docker` for a Docker Edge environment. The original example also claimed it returned a deployment script, which it does not. I replaced it with a working example that captures `EDGE_KEY` and a usable `EDGE_ID`.
- The async installation example used unsupported agent environment variables: `EDGE_CHECKIN_INTERVAL` and `EDGE_SNAPSHOT_INTERVAL`. Portainer’s generated commands and agent source use `EDGE_ASYNC=1`; the interval settings are configured in Portainer, not via those agent env vars. I removed the invalid variables and added the self-signed certificate flag for parity with the standard example.
- The post presented async mode as a general option, but current Portainer docs state Edge Agent Async mode is only available in Portainer Business Edition. I added that constraint to the async example.
- The Windows example used an incorrect `-v` named-pipe mount and omitted the additional mounts Portainer generates for Windows Edge Agent deployments. I replaced it with the current PowerShell `--mount` form from Portainer’s generated command logic.
- The examples used `portainer/agent:latest`, but Portainer’s upgrade guidance says the agent version should match the Portainer Server version. I switched the examples to `portainer/agent:lts` and noted that the image tag should match the server version.

## Review Notes
- `portainer/agent:lts` is a safe current example for Portainer’s LTS channel, but production deployments should still match the exact server channel or version in use.
- The `--insecure` examples are only appropriate when Portainer is using a self-signed certificate; that caveat is now called out inline.
