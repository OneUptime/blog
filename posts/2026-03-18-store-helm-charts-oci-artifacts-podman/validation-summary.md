# Validation Summary: How to Store Helm Charts as OCI Artifacts with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- OCI artifacts
- Helm
- Kubernetes
- OCI-compliant container registries
- Bash

## Sources Consulted
- Podman official documentation: `podman artifact` command reference, https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Podman official documentation: `podman artifact add`, https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- Podman official documentation: `podman artifact add` for v5.4.1, https://docs.podman.io/en/v5.4.1/markdown/podman-artifact-add.1.html
- Podman official documentation: `podman artifact add` for v5.5.0, https://docs.podman.io/en/v5.5.0/markdown/podman-artifact-add.1.html
- Podman official documentation: `podman artifact push`, https://docs.podman.io/en/latest/markdown/podman-artifact-push.1.html
- Podman official documentation: `podman artifact pull`, https://docs.podman.io/en/latest/markdown/podman-artifact-pull.1.html
- Podman official documentation: `podman artifact inspect`, https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- Helm official documentation: Use OCI-based registries, https://helm.sh/docs/v3/topics/registries/
- Helm official documentation: Helm chart OCI manifest media types, https://helm.sh/docs/v3/topics/registries/#helm-chart-manifest

## Issues Found
- The post used `podman artifact add --type "application/vnd.cncf.helm.chart.content.v1.tar+gzip"` and described `--type` as the Helm chart content media type. Podman uses `--type` for the artifact/config type and `--file-type` for the artifact file layer media type. I changed the examples to use `--type "application/vnd.cncf.helm.config.v1+json"` with `--file-type "application/vnd.cncf.helm.chart.content.v1.tar+gzip"`.
- The prerequisites said Podman 5.x or later, but the corrected examples require `--file-type`, which appears in Podman 5.5 documentation and is absent from Podman 5.4.1 documentation. I changed the prerequisite to Podman 5.5 or later.
- The versioning section tagged the chart as `latest`. Helm OCI chart references require the tag to match the chart semantic version, so `latest` is not valid for Helm-native chart consumption. I removed the `latest` example and changed the summary to refer to semantic-version tags.

## Review Notes
Podman and Helm were not installed in the local environment, so command behavior was verified against official documentation and upstream source documentation rather than local CLI execution.
