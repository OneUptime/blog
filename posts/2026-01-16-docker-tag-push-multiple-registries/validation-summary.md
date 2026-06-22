# Validation Summary: How to Tag and Push Docker Images to Multiple Registries

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker image tagging and pushing
- Docker Buildx and Buildx Bake
- Docker Hub, GHCR, AWS ECR, Google GCR, Google Artifact Registry, Azure ACR, and GitLab Registry
- GitHub Actions, GitLab CI, and Jenkins
- crane, skopeo, cosign, and OCI image metadata labels

## Sources Consulted
- Docker CLI reference: docker image tag - https://docs.docker.com/reference/cli/docker/image/tag/
- Docker CLI reference: docker image build - https://docs.docker.com/reference/cli/docker/image/build/
- Docker CLI reference: docker image push - https://docs.docker.com/reference/cli/docker/image/push/
- Docker CLI reference: docker login - https://docs.docker.com/reference/cli/docker/login/
- Docker CLI reference: docker buildx build - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Buildx Bake file reference - https://docs.docker.com/build/bake/reference/
- Docker GitHub Actions documentation and official action READMEs - https://docs.docker.com/build/ci/github-actions/ and https://github.com/docker/login-action
- GitHub Container Registry documentation - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- AWS ECR private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Google Artifact Registry Docker authentication - https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- go-containerregistry crane command documentation - https://github.com/google/go-containerregistry/tree/main/cmd/crane/doc
- skopeo copy documentation - https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- Sigstore cosign signing documentation - https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Docker Content Trust retirement notice - https://docs.docker.com/engine/security/trust/

## Issues Found
- Git branch names were used directly as Docker tags. Branch names can contain characters such as `/` that are invalid in Docker tags, so the example now sanitizes branch names before tagging images.
- Several non-interactive login examples passed passwords or tokens with `-p`/`--password`, which can expose secrets in shell history or process listings. These examples now use `--password-stdin`, matching Docker's documented recommendation.
- GitHub Actions examples used older Docker action major versions. Updated the Docker setup, login, and build-push actions to current major versions shown in official Docker action documentation.
- The immutable tag best-practice examples used unqualified `myapp` image references for `docker push`, which would resolve to Docker Hub's `library` namespace. These now use fully qualified `docker.io/mycompany/myapp` references.
- Docker Content Trust was listed as a signing best-practice example, but Docker Content Trust / Notary v1 is being retired. Removed that example and kept cosign as the signing example.

## Review Notes
The main Docker tagging, Buildx multi-registry push, Buildx Bake, ECR login, crane copy, skopeo copy, and OCI label examples are technically correct. The parallel push script is valid, but a future improvement could track individual background job failures instead of only waiting for completion.
