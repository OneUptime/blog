# Validation Summary: How to Build an OCI Artifact Registry Workflow for Helm Charts

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OCI registries and OCI artifacts
- Harbor container registry
- Docker Registry
- Docker CLI and Docker Buildx
- Helm OCI chart workflows
- GitHub Actions
- Sigstore Cosign
- Trivy
- Harbor API, RBAC, robot accounts, retention, replication, and scanning

## Sources Consulted
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Harbor Helm installation documentation: https://goharbor.io/docs/2.12.0/install-config/harbor-ha-helm/
- Harbor robot account documentation: https://goharbor.io/docs/2.12.0/administration/robot-accounts/
- Harbor OpenAPI specification: https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml
- Docker Buildx command documentation: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Registry official image documentation: https://hub.docker.com/_/registry
- Trivy Helm scanning documentation: https://trivy.dev/latest/docs/coverage/iac/helm/
- Sigstore Cosign signing documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Docker GitHub Actions documentation and release references: https://github.com/docker/build-push-action, https://github.com/docker/metadata-action, https://github.com/docker/login-action, https://github.com/docker/setup-buildx-action

## Issues Found
- The Harbor Helm repository URL was incorrect. Replaced `https://helm.goanywhere.com/chartrepo/library` with the official `https://helm.goharbor.io`.
- The Helm OCI example used `HELM_EXPERIMENTAL_OCI=1` as if it were required. Removed it because OCI support is enabled by default in Helm 3.8 and newer.
- The Helm push example claimed a chart directory can be pushed directly. Replaced it with the supported packaged `.tgz` push workflow.
- The image and chart examples reused the same registry repository/tag path, which can collide. Updated chart references to `myproject/charts/myapp`.
- The GitHub Actions workflow used older action versions and a branch-version expression that produced invalid Helm chart versions on branch builds. Updated action versions and fixed version derivation.
- The Cosign example signed the chart using the image reference and assumed a local key file existed. Updated it to sign the chart reference with `env://COSIGN_PRIVATE_KEY` and `--yes` for CI.
- The Harbor retention API endpoint was wrong. Replaced the repository-scoped endpoint with the Harbor `/retentions` API and added the required policy scope, trigger, algorithm, and template fields.
- `helm search repo` was used with an OCI URL, which is not a supported way to search OCI charts. Replaced those examples with `helm show chart` for a specific OCI chart.
- The Harbor automated scanning API example used the wrong endpoint shape and included `severity` as part of scanning. Updated it to use project metadata for `auto_scan`.
- The Harbor robot account example used an outdated project-scoped endpoint. Updated it to the current `/robots` endpoint with `level: "project"`.

## Review Notes
The Docker, Buildx, Trivy, replication, project member, and pull/install examples are broadly consistent with current documentation after the corrections above. Harbor API examples can still vary slightly by Harbor version and project configuration, especially for retention policy creation when a project already has a retention policy bound.
