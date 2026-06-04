# Validation Summary: How to Use Go Docker SDK for Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Docker Engine API
- Docker Go SDK
- Docker containers
- Docker images
- Docker events
- Docker container stats

## Sources Consulted
- Docker Docs: Develop with Docker Engine SDKs - https://docs.docker.com/reference/api/engine/sdk/
- Docker Docs: Examples using the Docker Engine SDKs and Docker API - https://docs.docker.com/reference/api/engine/sdk/examples/
- Docker Docs: Docker Engine API versioning - https://docs.docker.com/reference/api/engine/
- Go package reference: github.com/moby/moby/client - https://pkg.go.dev/github.com/moby/moby/client
- Go package reference: github.com/docker/docker/client - https://pkg.go.dev/github.com/docker/docker/client
- Moby repository notice about Docker v29 module changes - https://github.com/moby/moby

## Issues Found
- The post used the older `github.com/docker/docker` SDK module and `client.NewClientWithOpts(..., client.WithAPIVersionNegotiation())`. Docker's current documentation now installs `github.com/moby/moby/client`, and `WithAPIVersionNegotiation` is deprecated because API-version negotiation is enabled by default. Updated the setup commands, imports, and client constructor calls.
- Several examples used the pre-v29 Docker client method signatures. Updated calls such as `Info`, `ContainerCreate`, `ContainerStart`, `ContainerInspect`, `ContainerList`, `ImageList`, `ImageTag`, `ImagePrune`, and `Events` to use the current option and result wrapper types.
- The stats example used `ContainerStatsOneShot` and decoded `types.StatsJSON`. Updated it to `ContainerStats` with `Stream: false` and `IncludePreviousSample: true`, decoding into `container.StatsResponse` so the CPU delta calculation has the previous sample it relies on.
- The event listener used the old `filters.NewArgs()` package. Updated it to the current `client.Filters` type initialized with `make(client.Filters).Add(...)`.
- The build section said the binary could be copied to any Linux machine. Narrowed this to a compatible Linux amd64 machine with Docker daemon access, which is the actual requirement for the built target.

## Review Notes
The examples are written as separate function snippets, not as one directly buildable program. A future improvement would be to include a complete sample CLI that wires these functions into commands.
