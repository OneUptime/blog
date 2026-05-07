# Validation Summary: How to Use the Podman REST API to Manage Pods

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman Libpod REST API
- Pods and container networking
- `curl`
- Python
- `jq`
- Kubernetes YAML generation

## Sources Consulted
- Podman system service docs: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman pod create docs: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman pod ps docs: https://docs.podman.io/en/latest/markdown/podman-pod-ps.1.html
- Podman API reference entrypoint: https://docs.podman.io/en/latest/_static/api.html
- Official current Podman OpenAPI spec: https://storage.googleapis.com/libpod-master-releases/swagger-latest.yaml
- Official Podman v4.0 OpenAPI spec: https://storage.googleapis.com/libpod-master-releases/swagger-v4.0.yaml
- Podman v4.0 pod inspect data structures: https://raw.githubusercontent.com/containers/podman/v4.0.0/libpod/define/pod_inspect.go
- Podman entity definitions for pod list/stats: https://raw.githubusercontent.com/containers/podman/main/pkg/domain/entities/types/pods.go
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The custom-network pod example used `networks` in the pod creation body. Podman's pod create schema uses `Networks` for per-network options, so I changed that field name to match the official OpenAPI schema.
- The container `mounts` examples used `destination`, `source`, and `type`. Podman's `Mount` schema uses `Target`, `Source`, and `Type`, so I corrected all mount objects to the documented field names.
- The label-filter example embedded raw JSON directly in the URL. With curl, `{}` and `[]` trigger URL globbing unless they are encoded or globbing is disabled, so the command would fail. I changed the example to use `--get` with `--data-urlencode` so the `filters` query is sent correctly.
- The prose stated infra-container behavior as unconditional. Podman supports pods without infra containers, so I changed those statements to describe the default behavior instead of an absolute rule.
- The stats example said "all pods" even though the `all=true` stats query applies to running pods. I clarified that wording.
- The Kubernetes generation example implied the pod must already be running. The API generates YAML from a pod or container object, so I removed that implication.

## Review Notes
The post pins requests to `/v4.0.0/...`. That is still workable: Podman's `podman system service` documentation states that the server does not reject requests with an unsupported version set, and the corrected examples were also checked against the official v4.0 schema. A future cleanup could switch the examples to a newer version string for readability, but it is not required for correctness.
