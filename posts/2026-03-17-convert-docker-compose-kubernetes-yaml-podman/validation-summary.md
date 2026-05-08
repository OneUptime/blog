# Validation Summary: How to Convert Docker Compose to Kubernetes YAML Using Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Compose
- Docker Compose / Compose Specification
- Kubernetes YAML
- Kubernetes Pods
- Kubernetes Services
- PostgreSQL, NGINX, and Python container images

## Sources Consulted
- Podman documentation: `podman compose` command, https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman documentation: `podman kube generate` command, https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html
- Podman documentation: `podman pod create` command, https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Docker Compose reference: version and name top-level elements, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose reference: services and `container_name`, https://docs.docker.com/reference/compose-file/services/
- Kubernetes documentation: Labels and selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: Services, https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it because current Compose uses the Compose Specification and the `version` field is only retained for backward compatibility.
- The post used `podman-compose` commands, while current Podman documentation describes the official command as `podman compose`, a wrapper around an external Compose provider. Updated the commands and heading accordingly.
- The post used `podman generate kube`, while current Podman documentation presents the command as `podman kube generate`. Updated all examples and summary text.
- The Compose example did not guarantee that containers would be named `web`, `api`, and `db`, but later commands generated YAML from those names. Added `container_name` values so the commands resolve as shown.

## Review Notes
The Kubernetes Service examples are syntactically valid, but generated labels should still be checked in the resulting YAML before applying the Services to a real cluster. Podman can also generate Service YAML with `podman kube generate --service` for pods with port mappings.
