# Validation Summary: How to Set Up Image Signing and Verification in Portainer - Verification

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Content Trust (DCT) / Notary v1
- Cosign
- GitHub Actions OIDC
- Connaisseur
- Kubernetes admission control

## Sources Consulted
- Docker Docs, Content trust in Docker: https://docs.docker.com/engine/security/trust/
- Docker Docs, docker trust signer add: https://docs.docker.com/reference/cli/docker/trust/signer/add/
- Docker Docs, Docker Official Images trusted content note: https://docs.docker.com/docker-hub/repos/manage/trusted-content/official-images/
- Docker Blog, Retiring Docker Content Trust: https://www.docker.com/blog/retiring-docker-content-trust/
- Sigstore Docs, Cosign installation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Docs, Signing with self-managed keys: https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/
- Sigstore Docs, Signing containers: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Docs, Verifying signatures: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Docs, OIDC verification cheat sheet: https://docs.sigstore.dev/quickstart/verification-cheat-sheet/
- Sigstore GitHub Action, cosign-installer: https://github.com/sigstore/cosign-installer
- Sigstore GitHub Action releases: https://github.com/sigstore/cosign-installer/releases
- Sigstore Cosign releases: https://github.com/sigstore/cosign/releases
- GitHub Docs, OpenID Connect reference: https://docs.github.com/en/actions/reference/security/oidc
- Connaisseur Docs, Getting started: https://sse-secure-systems.github.io/connaisseur/v3.3.4/getting_started/
- Connaisseur Docs, Basics: https://sse-secure-systems.github.io/connaisseur/v3.3.4/basics/
- Portainer Docs, Webhooks: https://docs.portainer.io/user/docker/stacks/webhooks

## Issues Found
- The post described Docker Content Trust as something enabled on the Docker host and inherited by Portainer. Docker documents `DOCKER_CONTENT_TRUST` as a Docker CLI client setting, so I changed the heading and explanatory bullet to make that scope explicit.
- The persistence example appended `export DOCKER_CONTENT_TRUST=1` to `/etc/environment`, which is not a shell profile. I replaced it with a shell-profile example so the command is valid as written.
- The DCT section treated Docker Content Trust as a current general-purpose approach. I updated the wording and summary table to describe it as a legacy Notary v1 workflow, which matches current Docker guidance.
- The Cosign container alias used the old `gcr.io/projectsigstore/cosign` image path and only mounted the Cosign config directory. I updated it to the current `ghcr.io/sigstore/cosign/cosign` image and mounted the working directory so `cosign generate-key-pair` and local key files behave as described.
- The GitHub Actions example used an outdated `cosign-installer` version, pinned an older Cosign release, and included `COSIGN_EXPERIMENTAL`, which is no longer required for keyless signing. I updated the versions and removed the obsolete environment variable.
- The GitHub Actions example omitted the required permissions context for OIDC signing to GHCR. I added a note that `id-token: write` and `packages: write` are required for the shown flow.
- The Connaisseur example used outdated chart value paths (`validators` and `trust_roots`). I updated it to the current `application.validators` and `trustRoots` schema and switched the public-key injection to `--set-file`, which fits a PEM file correctly.

## Review Notes
- Docker is retiring Docker Content Trust for Docker Official Images, and Docker now recommends planning migrations toward Sigstore or Notation. The post is still technically relevant because it uses a custom image repository example and now frames DCT as legacy.
- The keyless GitHub Actions example assumes the image has already been pushed to GHCR earlier in the workflow.
- Helm and Docker CLIs were not installed in this workspace, so command validation relied on current official documentation rather than local `--help` output.
