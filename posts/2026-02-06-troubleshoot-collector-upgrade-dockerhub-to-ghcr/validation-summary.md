# Validation Summary: How to Troubleshoot Collector Version Upgrade Breaking Changes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- Docker and Docker manifests
- GitHub Container Registry (GHCR)
- Kubernetes Deployments and imagePullSecrets
- OpenTelemetry Helm chart
- GitHub CLI
- crane

## Sources Consulted
- OpenTelemetry Collector Docker install docs: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector distributions repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry Helm chart docs: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Helm chart upgrade guide: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/UPGRADING.md
- GHCR package page for OpenTelemetry Collector Contrib: https://github.com/open-telemetry/opentelemetry-collector-releases/pkgs/container/opentelemetry-collector-releases%2Fopentelemetry-collector-contrib
- GitHub Container Registry docs: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Kubernetes image pull secret docs: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Local command checks: `docker manifest inspect otel/opentelemetry-collector-contrib:0.121.0`, `docker manifest inspect otel/opentelemetry-collector-contrib:0.123.1`, `docker manifest inspect ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.123.1`, `gh release view v0.123.1 --repo open-telemetry/opentelemetry-collector-releases`

## Issues Found
- The post described the change as a broad move from DockerHub to GHCR and used `0.121.0` in all examples. The OpenTelemetry Helm chart upgrade guide identifies the DockerHub publishing stop at Collector release `v0.123.1`, and local manifest checks confirmed `otel/opentelemetry-collector-contrib:0.121.0` still exists on DockerHub while `0.123.1` does not. Updated the wording and examples to use `0.123.1`.
- The `docker manifest inspect` example was labeled as listing available tags. That command inspects a specific tag's manifest; `crane ls` lists tags. Updated the comment to say "Inspect a specific tag."
- The GitHub CLI release command used `open-telemetry/opentelemetry-collector-contrib` for `v0.123.1`, but that release exists in `open-telemetry/opentelemetry-collector-releases`. Updated the command to the correct repository.

## Review Notes
OpenTelemetry's current Docker install docs still show both DockerHub and GHCR examples for the core Collector image, so future updates should avoid implying that every documented DockerHub image reference is already invalid. The Helm snippet assumes an existing release already has required chart values such as `mode` set.
