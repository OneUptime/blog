# Validation Summary: How to Configure Docker for CI/CD

## Status
validated

## Post Type
Tutorial / Guide — multi-platform CI/CD configuration walkthrough with code examples for GitHub Actions, GitLab CI, and Jenkins.

## Technologies Covered
- Docker / Dockerfile (multi-stage builds, BuildKit, Buildx)
- Docker Compose (Compose Spec / v2 `docker compose` CLI)
- GitHub Actions (actions/checkout, docker/setup-buildx-action, docker/login-action, docker/metadata-action, docker/build-push-action, docker/setup-qemu-action, github/codeql-action/upload-sarif, actions/upload-artifact)
- GitLab CI (Kaniko executor, Docker-in-Docker)
- Jenkins Declarative Pipeline (Docker Pipeline plugin, Slack Notification plugin)
- Trivy (Aqua Security container scanner)
- Semgrep (SAST), TruffleHog (secret detection), Hadolint (Dockerfile linting), Anchore Syft (SBOM)
- Kubernetes kubectl rollout
- Node.js / npm
- PostgreSQL, Redis (compose services)

## Sources Consulted
- Docker docs — Multi-stage builds, BuildKit, `--cache-from`/`--cache-to`, HEALTHCHECK (https://docs.docker.com/build/)
- docker/metadata-action README — tag formats, `type=sha` default short SHA vs `format=long` (https://github.com/docker/metadata-action)
- docker/build-push-action v5 inputs (https://github.com/docker/build-push-action)
- docker/setup-buildx-action v3, docker/setup-qemu-action v3, docker/login-action v3
- github/codeql-action/upload-sarif v3 (https://github.com/github/codeql-action)
- aquasecurity/trivy-action — image-ref, format=sarif, severity inputs (https://github.com/aquasecurity/trivy-action)
- Kaniko executor flags — `--context`, `--dockerfile`, `--destination`, `--cache`, `--cache-ttl` (https://github.com/GoogleContainerTools/kaniko)
- GitLab CI predefined variables (`CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_COMMIT_SHA`, `CI_PROJECT_DIR`)
- Jenkins Declarative Pipeline syntax — `agent`, `options`, `stages`, `post`, `when`, `credentials()` binding
- Compose Spec — `depends_on.condition: service_healthy`, healthcheck syntax, `--wait`/`--wait-timeout` for `docker compose up`
- npm CLI docs — `npm ci`, `--include=dev`, `--only=production` (deprecated in favor of `--omit=dev`)
- hadolint/hadolint-action v3.1.0, anchore/sbom-action v0, trufflesecurity/trufflehog action

## Issues Found
1. **GitHub Actions test step SHA tag mismatch (Section 2).** The `docker/metadata-action` tag rule `type=sha,prefix=` produces a **short** 7-character SHA tag by default. The subsequent test step ran `docker run … :${{ github.sha }}` which expands to the **full** 40-character SHA, so no such image tag would exist and the test step would fail with "Unable to find image".
   - **Fix:** Changed `type=sha,prefix=` to `type=sha,prefix=,format=long` so the generated tag matches `${{ github.sha }}`.

## Review Notes
- **`npm ci --only=production` (Section 1)** still works but is deprecated in npm v9+; the modern equivalent is `npm ci --omit=dev`. Left as-is since the code is still functional and the author's intent is clear.
- **`returntocorp/semgrep-action@v1` (Section 9)** is the legacy path; Semgrep has migrated branding/ownership to `semgrep/semgrep-action`. The legacy path may continue to work via GitHub redirects but new pipelines should use the current action.
- **`aquasecurity/trivy-action@master` (Sections 2 and 9)** pins to a moving branch rather than a release tag. This is what Aqua officially recommends in their README, but pinning to a SHA or release tag (e.g. `@0.24.0`) is safer for reproducible builds.
- **Kaniko `v1.19.0-debug` (Section 3)** is a valid published tag but somewhat behind the current Kaniko releases. Functional and pinned for reproducibility, which is appropriate for a tutorial.
- **GCR (`gcr.io`) in Section 7** is in long-term migration to Artifact Registry, but the legacy gcr.io endpoints remain operational for existing projects.
- **Blue-green script (Section 10):** the `nginx -s reload` step assumes the nginx upstream config has already been switched out-of-band; the comment hints at this but the actual config swap is left as an exercise. Acceptable for an illustrative example.
- All GitHub Action versions used (checkout@v4, setup-buildx-action@v3, login-action@v3, metadata-action@v5, build-push-action@v5, setup-qemu-action@v3, codeql-action/upload-sarif@v3, upload-artifact@v4) are current major versions as of the post date.
