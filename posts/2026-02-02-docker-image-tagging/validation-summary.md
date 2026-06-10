# Validation Summary: How to Handle Docker Image Tagging

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Docker (build, tag, push commands)
- Docker Registry v2 HTTP API
- Dockerfile (multi-stage builds, ARG, LABEL, OCI image annotations)
- Semantic Versioning (SemVer)
- Git (rev-parse for SHA and branch metadata)
- GitHub Actions (actions/checkout, docker/setup-buildx-action, docker/login-action, docker/metadata-action, docker/build-push-action)
- GitHub Container Registry (ghcr.io)
- Kubernetes (Deployment manifests, kubectl set image, kubectl rollout status, jsonpath queries)
- Google Artifact Registry (gcloud artifacts repositories)
- AWS ECR (image tag mutability)
- Bash scripting (curl, jq, regex)

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/ and https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Registry HTTP API V2 spec (manifest delete semantics, Docker-Content-Digest header): https://distribution.github.io/distribution/spec/api/
- OCI Image Spec annotations (org.opencontainers.image.*): https://github.com/opencontainers/image-spec/blob/main/annotations.md
- docker/metadata-action documentation (tag template syntax, type=ref / type=semver / type=sha, {{sha}} variable): https://github.com/docker/metadata-action
- docker/build-push-action documentation: https://github.com/docker/build-push-action
- GitHub Actions versions verified current: actions/checkout@v4, docker/setup-buildx-action@v3, docker/login-action@v3, docker/metadata-action@v5, docker/build-push-action@v5
- Semantic Versioning 2.0.0 spec: https://semver.org/
- Kubernetes recommended labels (app.kubernetes.io/version): https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- kubectl reference (set image, rollout status, jsonpath): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- gcloud artifacts repositories update --immutable-tags: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/update
- AWS ECR put-image-tag-mutability: https://docs.aws.amazon.com/cli/latest/reference/ecr/put-image-tag-mutability.html

## Issues Found
1. **Registry cleanup script used the wrong digest source.** In the `cleanup-registry.sh` example, the script extracted `.config.digest` from the manifest JSON and then issued `DELETE /v2/<repo>/manifests/<digest>`. `.config.digest` is the digest of the image *config blob*, not the manifest itself, so the DELETE call would either 404 or, worst case, target the wrong object. The Docker Registry v2 API requires the *manifest's own digest*, which the registry returns in the `Docker-Content-Digest` response header. Fixed the script to issue a `curl -I` against the manifest URL and parse `Docker-Content-Digest` from the response headers (case-insensitively, stripping CR/LF) before the DELETE.

## Review Notes
- The Dockerfile example uses `npm ci --only=production`. The `--only` flag was deprecated in npm 9 in favor of `--omit=dev`, but it still works in current npm releases, so this is not a correctness bug — just a stylistic point that may be worth updating in a future revision.
- The post places `app.kubernetes.io/version` under `annotations` in the Deployment template. By Kubernetes convention, `app.kubernetes.io/*` are recommended *labels*, not annotations. Using them as annotations is not technically invalid, but unconventional. Left as-is because it doesn't break anything.
- The metadata-action tag pattern `type=ref,event=branch,suffix=-{{sha}}` is correct: `{{sha}}` resolves to the short Git SHA, producing tags like `main-abc1234`.
- The SHA-tag regex `^[a-f0-9]{7,40}$` correctly matches short-to-full Git SHAs.
- The semver regex `^v[0-9]+\.[0-9]+\.[0-9]+$` matches the SemVer core (MAJOR.MINOR.PATCH with `v` prefix) but does not match pre-release or build metadata suffixes (e.g. `v1.2.3-rc.1`). For most "release tag" use cases this is fine; teams using pre-release tags would need to extend it.
