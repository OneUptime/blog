# Validation Summary: How to Migrate from Docker Registry v2 to Harbor Container Registry

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Harbor
- Docker Registry HTTP API v2 / OCI Distribution
- Kubernetes
- Helm
- Skopeo
- GNU parallel
- Harbor API v2.0
- Trivy scanning
- Cosign content trust
- GitLab CI
- GitHub Actions

## Sources Consulted
- Harbor Helm chart values: https://github.com/goharbor/harbor-helm/blob/main/values.yaml
- Harbor API v2.0 OpenAPI specification: https://github.com/goharbor/harbor/blob/main/api/v2.0/swagger.yaml
- Harbor robot account documentation: https://goharbor.io/docs/2.12.0/administration/robot-accounts/
- Harbor replication documentation: https://goharbor.io/docs/latest/administration/configuring-replication/create-replication-rules/
- Harbor vulnerability scanning documentation: https://goharbor.io/docs/latest/administration/vulnerability-scanning/
- Harbor OCI Helm chart documentation: https://goharbor.io/docs/main/working-with-projects/working-with-oci/working-with-helm-oci-charts/
- OCI Distribution Specification: https://github.com/opencontainers/distribution-spec/blob/main/spec.md
- Skopeo copy documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- GitHub Actions checkout action: https://github.com/actions/checkout
- Docker login-action and build-push-action documentation: https://github.com/docker/login-action and https://docs.docker.com/guides/gha/

## Issues Found
- Updated Harbor feature wording from legacy image signing / ChartMuseum-style chart repository language to current content trust and OCI Helm chart support.
- Removed the obsolete `notary.enabled` Helm chart value from the Harbor values example; the current upstream chart no longer exposes that top-level value.
- Changed Harbor project creation to set project visibility through `metadata.public`, matching the current Harbor `ProjectReq` schema where top-level `public` is deprecated/reserved.
- Added missing old-registry credentials to the parallel migration script and changed tag listing to tolerate repositories with null/empty tag lists.
- Quoted the Harbor robot username in the Kubernetes pull-secret command so the shell does not expand `$cicd`.
- Replaced the Deployment image rewrite loop so each matching container is updated by container name instead of rewriting every container to a value derived from the first container image.
- Updated scan and content-trust examples to use the current Harbor project metadata fields, including `enable_content_trust_cosign`.
- URL-encoded Harbor repository names before using them in artifact API paths, which is required for repositories containing slashes.
- Updated GitHub Actions examples to current major versions of `actions/checkout`, `docker/login-action`, and `docker/build-push-action`.
- Added pagination caveats for Docker Registry `_catalog` and Harbor repository-count validation.
- Reordered decommissioning commands so the registry archive is created and copied before scaling the registry Deployment to zero.

## Review Notes
- Local checks: `validation.json` was validated with `jq`; embedded YAML snippets parsed successfully with PyYAML; shell snippets were syntax-checked after extracting them from the Markdown. Runtime validation against live Harbor, Kubernetes, Helm, Skopeo, GNU parallel, GitLab, or GitHub Actions was not possible in this workspace.
- The migration examples still assume a simple registry layout and a single destination Harbor project. Very large registries should implement full pagination for `_catalog`, tag listing, and Harbor repository APIs.
