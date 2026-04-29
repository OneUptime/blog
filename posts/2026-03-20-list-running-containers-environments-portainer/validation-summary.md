# Validation Summary: How to List All Running Containers Across Environments in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Docker Engine API
- Python (`requests`)
- Kubernetes

## Sources Consulted
- Portainer Home documentation: https://docs.portainer.io/user/home
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer Kubernetes kubeconfig documentation: https://docs.portainer.io/user/kubernetes/kubeconfig
- Portainer environment terminology documentation: https://docs.portainer.io/admin/environments
- Portainer source defining environment types and status enums: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Docker Engine API `GET /containers/json` reference: https://docs.docker.com/reference/api/engine/version/v1.24/

## Issues Found
- The post description and intro implied the same container-listing approach worked across Docker and Kubernetes environments. I narrowed that wording to Docker-based environments because Portainer exposes Docker and Kubernetes through different gateway paths.
- The Python example called `/api/endpoints/{id}/docker/containers/json` for every environment returned by Portainer. That would break on mixed installations that include Kubernetes or Azure environments, so I added a filter for Docker-backed Portainer environment types before calling the Docker container endpoint.
- The "Filtering by State or Image" snippet actually filtered restart loops by the human-readable `status` string instead of the structured `state` field. I changed it to use `state == "restarting"` so it matches the section title and the Docker API data model.
- The UI section overstated what every Home card shows by implying a uniform container breakdown and a direct container-list shortcut on every environment. I corrected that text to describe environment-specific summaries and connect/inspect actions instead.

## Review Notes
Portainer uses the term "environments" in the UI, but the API still uses `/api/endpoints`; this remains current in the official documentation. Kubernetes environments are proxied through `/api/endpoints/{id}/kubernetes`, so a true cross-environment inventory that includes Kubernetes would need Kubernetes-specific API calls rather than the Docker `/containers/json` endpoint.
