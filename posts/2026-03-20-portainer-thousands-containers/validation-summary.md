# Validation Summary: How to Configure Portainer for Thousands of Containers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Portainer Agent
- Docker Engine
- Docker Swarm
- Docker Compose
- Nginx reverse proxy
- Portainer API
- Docker Engine API

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer architecture: https://docs.portainer.io/start/architecture
- Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Install Portainer Agent on Docker Swarm: https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer reverse proxy guidance: https://docs.portainer.io/advanced/reverse-proxy
- Deploying Portainer behind nginx reverse proxy: https://docs.portainer.io/sts/advanced-topics/reverse-proxy/nginx
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Official Portainer Agent repository: https://github.com/portainer/agent
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The post used `--snapshot-interval=600`, but Portainer documents `--snapshot-interval` as a Go duration string such as `30s`, `5m`, or `1h`. I changed the examples to `--snapshot-interval=10m`.
- The server example used `--no-analytics`, which Portainer documents as deprecated. I removed that flag.
- The server example enabled `--edge-compute` and exposed port `8000` even though the post is about classic Portainer Agents rather than Edge Agents. I removed the Edge-specific flag and port from the main server example.
- The introduction referred to "agent connection limits" as a key scaling constraint. Portainer's architecture docs state that a single Portainer Server can accept connections from any number of Portainer Agents, so I rewrote that sentence to focus on documented server-side constraints instead.
- The standalone agent Compose example included `AGENT_CLUSTER_ADDR=tasks.portainer_agent`, which is for Swarm service deployments, not standalone hosts. I removed it from the standalone example.
- The Swarm `docker service create` example omitted the mandatory `AGENT_CLUSTER_ADDR` setting and did not publish the agent port in host mode. I corrected the command to create the overlay network first, set `AGENT_CLUSTER_ADDR=tasks.portainer_agent`, and publish `9001` in host mode.
- The database compaction script was technically broken because it mounted a named volume into a temporary container but then tried to read and move `/data/...` paths from the host. I replaced it with guidance that uses Portainer's documented `--compact-db` startup flag and a maintenance restart.
- The API section claimed pagination but only showed Docker API filtering. I renamed the section to filtering, kept the examples focused on filtering/running-container queries, and changed the auth header to `X-API-Key`, which matches Portainer's access-token documentation.
- The high-availability section proposed multiple Portainer Server instances with shared storage. Portainer's architecture docs explicitly say running multiple Portainer Server instances against the same clusters is not supported. I replaced this with a supported single-server reverse-proxy pattern.
- The shared-storage example used an `nfs` volume driver shape that would not be valid as written in standard Docker Compose. I replaced it with a local bind-backed volume consistent with the rest of the post.

## Review Notes
- Portainer currently describes the classic Portainer Agent on Docker Standalone and Docker Swarm as a legacy option and recommends the Edge Agent for most new deployments. I did not rewrite the article around Edge Agents because the post is specifically about classic agent-based scaling, but this is worth considering in a future revision.
- The examples still use `:latest` image tags. That is not technically invalid, but pinned `lts` or explicit version tags would make the guide more reproducible for production readers.
