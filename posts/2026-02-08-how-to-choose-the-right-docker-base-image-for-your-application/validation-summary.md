# Validation Summary: How to Choose the Right Docker Base Image for Your Application

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker base images
- Dockerfile syntax
- Docker CLI
- Docker Scout
- Trivy
- Alpine Linux
- Debian and Debian slim images
- Ubuntu container images
- Google Distroless images
- Go, Node.js, Python, and Java container examples

## Sources Consulted
- Docker Docs: Base images and `FROM scratch` - https://docs.docker.com/build/building/base-images/
- Docker Docs: Dockerfile best practices for choosing minimal trusted base images - https://docs.docker.com/build/building/best-practices/
- Docker Docs: Docker networking DNS behavior - https://docs.docker.com/network/
- Docker Docs: Dockerfile reference for exec-form `CMD`, `ENTRYPOINT`, and `FROM` digests - https://docs.docker.com/reference/builder
- Docker Docs: Docker Scout `cves` CLI reference - https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Docs: Docker image digests - https://docs.docker.com/dhi/core-concepts/digests/
- Docker Hub: Node official image tags - https://hub.docker.com/_/node
- Docker Hub: Debian official image tags - https://hub.docker.com/_/debian
- Docker Hub: Ubuntu official image tags - https://hub.docker.com/_/ubuntu
- npm Docs: `npm ci` and `--omit=dev` - https://docs.npmjs.com/cli/commands/npm-ci/
- Go Docs: Go release policy and release history - https://go.dev/doc/devel/release
- Node.js Docs: Release schedule and supported versions - https://nodejs.org/en/about/previous-releases
- GoogleContainerTools Distroless README and Java image docs - https://github.com/GoogleContainerTools/distroless
- Trivy Docs: `trivy image` command - https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/
- Local CLI help: `docker search --help`, `npm ci --help`, and `npm help ci`

## Issues Found
- The Go scratch example used `golang:1.22`, which is no longer within Go's supported release window as of 2026-06-05. Updated it to `golang:1.26` based on the official Go release policy.
- The Node.js examples used Node 20, which reached end-of-life before the validation date. Updated examples and pinning guidance to Node 24, the current LTS line shown in official Node and Docker image references.
- The Alpine Node example used `npm ci --only=production`. Current npm documentation describes `--omit=dev` for omitting development dependencies, so the command was updated.
- The scratch guidance said not to use scratch when the application needs DNS resolution. Docker provides DNS configuration to containers, so the warning was corrected to focus on missing OS files such as CA certificates, timezone data, and user/group files.
- The distroless Java example used `gcr.io/distroless/java17-debian12`. Current distroless documentation lists actively updated Java images under Debian 13 and marks other tags as deprecated, so the example was updated to `gcr.io/distroless/java17-debian13`.
- The language-image command comment said `docker search node --limit 5` checks available tags. The command searches Docker Hub repositories, not tags, so the comment was corrected.

## Review Notes
The approximate image sizes and vulnerability-count comparisons are intentionally illustrative and can vary by architecture, tag date, package updates, scanner database, and application dependencies. The post's advice to pin versions and rebuild regularly remains technically sound.
