# Validation Summary: Why Does a Vulnerability Scanner Still Report CVEs in a Chainguard-Based Image?

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Chainguard Containers and Chainguard security advisories
- Wolfi and Chainguard APK packages
- Container image digests and multi-platform OCI images
- Grype and its vulnerability database
- Trivy
- Docker and Docker Buildx
- Kubernetes and kubectl JSONPath output
- SPDX software bills of materials (SBOMs)
- Package URLs (purls)
- Vulnerability Exploitability eXchange (VEX) and OpenVEX
- jq

## Sources Consulted

- [How Chainguard issues security advisories](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/security-advisories/how-chainguard-issues/) and [how to use Chainguard security advisories](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/security-advisories/how-to-use/)
- [False positives and false negatives in container scanners](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/working-with-scanners/false-results/) and the [Chainguard shared responsibility model](https://edu.chainguard.dev/chainguard/chainguard-images/about/shared-responsibility-model/)
- [Chainguard Containers FAQ](https://edu.chainguard.dev/chainguard/chainguard-images/faq/), [container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/), and [CVE visualizations](https://edu.chainguard.dev/chainguard/chainguard-images/features/cve_visualizations/)
- [Retrieving Chainguard SBOMs and attestations](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/retrieve-image-sboms/) and [using Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/how-to-use-chainguard-images/)
- [Getting started with OpenVEX and vexctl](https://edu.chainguard.dev/open-source/sbom/getting-started-openvex-vexctl/) and [CISA's minimum requirements for VEX](https://www.cisa.gov/sites/default/files/2023-04/minimum-requirements-for-vex-508c.pdf)
- [Grype CLI reference](https://oss.anchore.com/docs/reference/grype/cli/), [vulnerability database guide](https://oss.anchore.com/docs/guides/vulnerability/database/), [data sources](https://oss.anchore.com/docs/reference/grype/data-sources/), and [result interpretation](https://oss.anchore.com/docs/guides/vulnerability/interpreting-results/)
- [Trivy image CLI reference](https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_image/) and [vulnerability-scanning behavior and data sources](https://trivy.dev/docs/latest/scanner/vulnerability/)
- [Docker image pull](https://docs.docker.com/reference/cli/docker/image/pull/), [Docker image inspect](https://docs.docker.com/reference/cli/docker/image/inspect/), and [Docker Buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [SPDX 2.3 package information](https://spdx.github.io/spdx-spec/v2.3/package-information/), [SPDX external repository identifiers](https://spdx.github.io/spdx-spec/v2.3/external-repository-identifiers/), and the [Package URL specification](https://github.com/package-url/purl-spec)

## Issues Found

- The evidence-freezing example instructed readers to record the target platform and vulnerability database build time but did not capture the Grype database status or explicitly select a platform. Added `grype db status -o json`, an explicit `SCAN_PLATFORM`, and matching Docker, Grype, and Trivy platform flags so scans of multi-platform image indexes are reproducible.
- The post referred only to Wolfi-aware scanners and Wolfi advisory data. Current Grype and Trivy data-source documentation distinguishes both Wolfi and Chainguard security feeds. Updated the affected wording to cover Wolfi and Chainguard packages and advisory data.

## Review Notes

- The example registry, deployment, package name, and SHA-256 values are intentionally placeholders and must be replaced by the reader.
- Grype and Trivy were not installed in the review environment, so their commands were checked against their current official CLI references. Docker, Docker Buildx, kubectl, and jq syntax were additionally checked with locally installed CLIs; the live Chainguard Python tag was confirmed to resolve to separate `linux/amd64` and `linux/arm64` manifests.
