# Validation summary

## Checks performed

Reviewed official Aerospike network, namespace, Docker and info-command documentation. Verified server image 8.2.0.1 in official Docker Hub metadata. Reviewed INVALID_NODE_ERROR and alternate-service policy in Go client v8.9.0. Checked helper methods against Testcontainers Go v0.45.0 and its Moby API v1.56.1 dependency. Shell snippets passed bash -n; configuration braces balance and host/container/advertised ports agree. Diagram participant references checked structurally. Generated 1280x720 social image visually inspected for complete, readable title.

## Limitations

Docker and Go are unavailable locally. No server parser, startup, port mapping, info commands, Go compilation, discovery, or read/write tests ran. Examples are source-verified, not claimed as a tested deployment. Mermaid was not browser-rendered.

## Sources reviewed

- https://github.com/aerospike/aerospike-client-go/blob/v8.9.0/types/result_code.go
- https://aerospike.com/docs/database/manage/network/
- https://docs.docker.com/reference/cli/docker/container/port/
- https://aerospike.com/docs/database/reference/info/
- https://hub.docker.com/r/aerospike/aerospike-server/tags
- https://aerospike.com/docs/database/manage/namespace/
- https://aerospike.com/docs/database/install/docker/
- https://github.com/aerospike/aerospike-client-go/blob/v8.9.0/client_policy.go
- https://github.com/testcontainers/testcontainers-go/blob/v0.45.0/container.go
- https://github.com/testcontainers/testcontainers-go/blob/v0.45.0/modules/aerospike/aerospike.go
- https://github.com/moby/moby/blob/api/v1.56.1/api/types/network/port.go
- https://hub.docker.com/v2/repositories/aerospike/aerospike-server/tags/8.2.0.1

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. All 52 completed articles also passed combined isolated repository validation. The full existing catalog was not revalidated.
