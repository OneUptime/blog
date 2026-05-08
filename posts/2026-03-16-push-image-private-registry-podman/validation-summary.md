# Validation Summary: How to Push an Image to a Private Registry with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container registries
- CNCF Distribution Registry
- containers-registries.conf
- containers-certs.d
- Harbor
- AWS Elastic Container Registry (ECR)
- Skopeo
- Docker Registry HTTP API V2 / OCI Distribution API

## Sources Consulted
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman login` documentation: https://docs.podman.io/en/stable/markdown/podman-login.1.html
- containers/image `containers-registries.conf(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- containers-certs.d man page: https://www.mankier.com/5/containers-certs.d
- CNCF Distribution registry deployment documentation: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution HTTP API V2 specification: https://distribution.github.io/distribution/spec/api/
- Harbor image push/pull documentation: https://goharbor.io/docs/2.8.0/working-with-projects/working-with-images/pulling-pushing-images/
- AWS ECR Podman documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/Podman.html
- Skopeo project documentation: https://github.com/containers/skopeo

## Issues Found
- The local registry example used `docker.io/library/registry:2`. Current CNCF Distribution and Docker Official Image documentation use `registry:3` for the local registry quickstart, so the example was updated to `docker.io/library/registry:3`.
- The Harbor example said "Tag for a Harbor project" without making clear that Harbor requires the target project to already exist before pushing. The comment was changed to "Tag for an existing Harbor project."

## Review Notes
- Podman was not installed in the local review environment, so CLI flags were verified against the official Podman documentation instead of local `--help` output.
- The examples that use unauthenticated `curl` against `/v2/_catalog` and `/v2/<name>/tags/list` are valid for simple registries, but production registries may require authentication or disable catalog listing.
