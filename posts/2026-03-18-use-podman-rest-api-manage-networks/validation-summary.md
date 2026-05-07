# Validation Summary: How to Use the Podman REST API to Manage Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman REST API
- Podman networking and Netavark
- Container network management
- `curl`
- Python (`http.client`, `socket`, `json`)
- `jq`

## Sources Consulted
- Podman API reference: https://docs.podman.io/en/latest/_static/api.html
- `podman-system-service(1)`: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- `podman-network(1)`: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- `podman-network-create(1)`: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- `podman-network-connect(1)`: https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- `podman-network-disconnect(1)`: https://docs.podman.io/en/latest/markdown/podman-network-disconnect.1.html
- `podman-network-exists(1)`: https://docs.podman.io/en/stable/markdown/podman-network-exists.1.html
- `podman-network-rm(1)`: https://docs.podman.io/en/latest/markdown/podman-network-rm.1.html
- Podman source: `pkg/domain/entities/network.go`: https://github.com/containers/podman/blob/main/pkg/domain/entities/network.go
- Podman source: `pkg/domain/entities/types/network.go`: https://github.com/containers/podman/blob/main/pkg/domain/entities/types/network.go
- Common libnetwork types: https://github.com/containers/common/blob/main/libnetwork/types/network.go
- Podman spec generator: https://github.com/containers/podman/blob/main/pkg/specgen/specgen.go

## Issues Found
- The post listed `host` as a Podman network type in the context of network CRUD. I removed that item because `host` is a container network namespace mode, not a user-defined network object managed through the network API.
- The introduction claimed the article covered all network operations available through the API. I changed this to “the main network operations” because current Podman also exposes additional network operations such as update/reload that are not covered in the post.
- The filter examples passed raw JSON in the query string without disabling curl URL globbing. I added `curl -g` to the affected examples so the commands work reliably with braces in the URL.
- The explanation of `internal` networking was too broad. I corrected it to match Podman’s documented bridge-network behavior: removing the default route and restricting external access.
- The force-delete example said Podman disconnects containers first. I corrected it to say force removal removes containers attached to the network, which matches Podman’s documented behavior.

## Review Notes
- The examples use the `/v4.0.0/libpod` version prefix. Podman’s official `podman-system-service(1)` documentation states that the server does not reject requests with an unsupported API version set, so the versioned paths remain valid even though current docs show newer prefixes.
- The socket path shown in the examples is the rootless user socket. Rootful API service setups use `/run/podman/podman.sock`.
- I did not run live Podman API calls in this workspace; validation was performed against Podman’s official API reference, man pages, and source definitions.
