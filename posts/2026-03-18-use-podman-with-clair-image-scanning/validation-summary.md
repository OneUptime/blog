# Validation Summary: How to Use Podman with Clair for Image Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Clair v4
- `clairctl`
- Project Quay / Red Hat Quay security scanning
- CNCF Distribution (`registry:2`) notifications
- PostgreSQL
- GitHub Actions
- Python
- Bash

## Sources Consulted
- Clair getting started guide: https://quay.github.io/clair/howto/getting_started.html
- Clair configuration reference: https://quay.github.io/clair/reference/config.html
- Clair API reference: https://quay.github.io/clair/reference/api.html
- Clair CLI reference (`clairctl`): https://quay.github.io/clair/reference/clairctl.html
- Clair indexing concept docs: https://quay.github.io/clair/concepts/indexing.html
- Clair notifications docs: https://quay.github.io/clair/concepts/notifications.html
- Claircore manifest reference: https://quay.github.io/claircore/reference/manifest.html
- Claircore vulnerability report reference: https://quay.github.io/claircore/reference/vulnerability_report.html
- Clair GitHub releases page: https://github.com/quay/clair/releases
- Podman compose docs: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman image inspect docs: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Project Quay configuration docs: https://docs.projectquay.io/config_quay.html
- CNCF Distribution notifications docs: https://distribution.github.io/distribution/about/notifications/
- GitHub Actions Go setup guidance: https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-go

## Issues Found
1. The deployment example started Clair without specifying a required run mode and used the `latest` image tag. I updated the compose example to run Clair in `combo` mode with explicit `CLAIR_MODE` and `CLAIR_CONF` settings, and pinned the image to `quay.io/projectquay/clair:v4.8.0` because the official docs state that `latest` tracks the development branch.
2. The article used `podman-compose`, while the official Podman documentation documents `podman compose` as the supported entrypoint. I updated the command accordingly.
3. The `clairctl` and raw API examples implied that Clair could scan a local-only Podman image directly and that posting just a digest or generic JSON was sufficient. That is incorrect for Clair v4. I changed the examples so the image is pushed to a registry first, the Clair manifest is generated with `clairctl manifest`, and the API uses the required Clair media types.
4. The Bash and Python client examples were technically incorrect because they built requests from `podman inspect` output instead of a Clair manifest, submitted incomplete payloads to the indexer, and in Python assumed a vulnerability report shape that did not match Clair’s documented package-to-vulnerability mapping. I rewrote those examples to use registry-backed manifests and the documented API/report structures.
5. The standalone registry webhook example attempted to trigger indexing from a registry event by sending only the manifest digest. That would not work with Clair’s indexer API. I replaced it with a flow that uses registry notifications correctly: filter manifest push events, fetch the pushed manifest, construct a Clair manifest from layer digests and blob URLs, and submit that manifest to Clair with the correct headers.
6. The notifier callback URL used `/notifier/api/v1/notifications`, but Clair’s documented webhook callback path is `/notifier/api/v1/notification`. I corrected the path.
7. The GitHub Actions example would not work as written because the Clair service container had no configuration or mode, `podman` was not installed, and the scan tried to report on a local image reference that Clair could not fetch. I replaced it with a workflow that installs Podman, sets up Go 1.22, logs into a registry, pushes the image, installs `clairctl`, and then scans the pushed registry image through a configured Clair endpoint.

## Review Notes
- The corrected examples now reflect Clair’s actual operating model: Clair indexes manifests that reference registry-accessible layers. It does not inspect the local Podman image store directly.
- The local `registry:2` service in the tutorial is suitable for testing, but in practice local HTTP registries often require container-runtime-specific insecure-registry configuration. The official Clair docs also note that local-registry details vary by runtime and registry configuration.
- `podman compose` still depends on an installed compose provider, as documented by Podman.
- The standalone registry webhook example is written for single-platform image manifests. Multi-architecture manifest lists typically require handling child manifests separately.
