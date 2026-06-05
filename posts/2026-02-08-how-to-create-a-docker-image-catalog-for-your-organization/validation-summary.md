# Validation Summary: How to Create a Docker Image Catalog for Your Organization

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker and Dockerfiles
- Docker Registry
- Docker Scout
- AWS Elastic Container Registry
- GitHub Actions
- Alpine Linux packages
- yq
- Bash and awk
- OCI image metadata labels

## Sources Consulted
- Docker CLI documentation for `docker run`, `docker build`, and `docker push`: local `docker --help` output
- Docker Registry official image documentation: https://hub.docker.com/_/registry
- Dockerfile reference: https://docs.docker.com/reference/builder
- Docker Scout `cves` CLI reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker login and GitHub Actions documentation: https://docs.docker.com/reference/cli/docker/login/ and https://docs.docker.com/build/ci/github-actions/
- AWS CLI `ecr create-repository` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- GitHub Actions workflow syntax and scheduled workflow documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- Alpine Linux release branch documentation: https://www.alpinelinux.org/releases/
- Alpine Linux package index for `nodejs` and `npm`: https://pkgs.alpinelinux.org/
- mikefarah/yq documentation: https://mikefarah.gitbook.io/yq/
- OCI annotations specification: https://specs.opencontainers.org/image-spec/annotations/

## Issues Found
- The Alpine examples used `alpine:3.19`, which is end-of-support as of November 1, 2025. Updated the Alpine base image and catalog references to `3.23`, with supported/deprecated version examples adjusted accordingly.
- The Node.js runtime Dockerfile pinned Alpine package versions `nodejs=20.11.0-r0` and `npm=10.2.5-r0`, which do not match the current Alpine package index for the referenced supported Alpine release. Updated the example to `nodejs=24.14.1-r0` and `npm=11.11.0-r0`, and verified installation in `alpine:3.23`.
- The GitHub Actions workflow pushed to a private registry without authenticating first. Added `docker/login-action@v4` login steps using registry secrets before build/push operations.
- The Dockerfile validation script did not correctly handle `FROM --platform=... image AS stage` syntax. Replaced the `grep | awk | grep` pipeline with an `awk` parser that skips `FROM` options and extracts the actual base image.
- The catalog documentation generator piped multi-line YAML objects through `read`, which would not produce valid per-image records with mikefarah/yq. Replaced it with a tab-separated yq expression that emits name, description, and version per image.
- The versioning examples still used the older Node 20 catalog tags. Updated them to match the corrected Node 24 example.

## Review Notes
- The Docker Scout example is syntactically correct, but production pipelines may want to scan for high severity vulnerabilities as well as critical ones.
- The example uses mutable major/minor tags for convenience while advising pinned production Dockerfiles. Digest pinning can provide stronger reproducibility for high-control environments.
