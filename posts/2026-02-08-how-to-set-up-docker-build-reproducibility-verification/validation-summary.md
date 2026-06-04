# Validation Summary: How to Set Up Docker Build Reproducibility Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Buildx
- BuildKit
- OCI image exporters
- GitHub Actions
- pip and pip-tools
- Sigstore cosign
- SLSA provenance attestations

## Sources Consulted
- Docker Docs: Reproducible builds with GitHub Actions - https://docs.docker.com/build/ci/github-actions/reproducible-builds/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: OCI and Docker exporters - https://docs.docker.com/build/exporters/oci-docker/
- Docker Docs: Build attestations - https://docs.docker.com/build/metadata/attestations/
- Docker Docs: Provenance attestations - https://docs.docker.com/build/metadata/attestations/slsa-provenance/
- Docker Docs: docker buildx imagetools inspect - https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- BuildKit documentation: Build reproducibility - https://github.com/moby/buildkit/blob/master/docs/build-repro.md
- pip-tools documentation: pip-compile CLI - https://pip-tools.readthedocs.io/en/stable/cli/pip-compile/
- pip documentation: Secure installs / hash-checking mode - https://pip.pypa.io/en/stable/topics/secure-installs/
- Sigstore cosign documentation: verify-attestation CLI - https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md
- Docker setup-buildx-action README - https://github.com/docker/setup-buildx-action
- Local CLI help: `docker buildx build --help`
- Local CLI help: `docker buildx imagetools inspect --help`

## Issues Found
- The post claimed Docker BuildKit 0.12+ supports a `--source-date-epoch` flag directly. Current Docker Buildx CLI help does not include that flag, and the BuildKit documentation describes `SOURCE_DATE_EPOCH` as a special build argument/environment value instead. Updated the section to describe `SOURCE_DATE_EPOCH` correctly.
- The reproducible-output command used `source-date-epoch=0` as an OCI exporter parameter. Docker's OCI exporter documents `rewrite-timestamp=true`, but not a `source-date-epoch` output parameter. Removed the invalid parameter and set `SOURCE_DATE_EPOCH=0` with an explicit build argument.
- The verification script and CI example exported OCI tarballs without enabling timestamp rewriting, which would make timestamp-related reproducibility failures more likely even after following the BuildKit guidance. Added `--build-arg SOURCE_DATE_EPOCH=0` and `rewrite-timestamp=true` to the two-build comparison examples.
- The GitHub Actions workflow used `docker/setup-buildx-action@v3`. Current Docker examples and the action README use `docker/setup-buildx-action@v4`; updated the snippet to v4.

## Review Notes
The examples that use placeholder digests and hashes are illustrative and must be replaced with real digest and hash values in an actual project. BuildKit's timestamp controls do not make arbitrary builds reproducible by themselves; package repositories, downloaded artifacts, compiler outputs, file ordering, and language-specific build metadata still need to be pinned or normalized.
