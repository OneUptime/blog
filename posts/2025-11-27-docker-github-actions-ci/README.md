# How to Plug Docker into GitHub Actions for Fast, Secure CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, CI/CD, GitHub Actions, Security, DevOps, Automation

Description: Learn how to build, cache, scan, and publish Docker images inside GitHub Actions using BuildKit, buildx, provenance metadata, and vulnerability checks that keep pipelines fast and compliant.

---

GitHub Actions plus Docker gives you a portable CI pipeline—if you tame caching, secrets, and scans. Here’s an end-to-end workflow you can copy.

## 1. Reusable Workflow Layout

```
.github/workflows/
  docker-build.yml
  docker-release.yml
```

- `docker-build.yml`: run on every PR for testing.
- `docker-release.yml`: publish multi-arch images on main tags/releases.

## 2. Enable BuildKit and buildx

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
```

`setup-buildx` creates a builder that supports cache exports, multi-arch builds, and SBOMs.

## 3. Layered Cache Strategy

```yaml
      - uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: ${{ runner.os }}-buildx-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-buildx-

      - uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile
          push: false
          tags: ghcr.io/acme/api:pr-${{ github.event.number }}
          cache-from: type=local,src=/tmp/.buildx-cache
          cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max

      - name: Move cache
        run: |
          rm -rf /tmp/.buildx-cache
          mv /tmp/.buildx-cache-new /tmp/.buildx-cache
```

CI hits warm caches even on short-lived runners.

## 4. Security Scans Inline

```yaml
      - name: Scan image
        uses: aquasecurity/trivy-action@0.18.0
        with:
          image-ref: ghcr.io/acme/api:pr-${{ github.event.number }}
          severity: CRITICAL,HIGH
          exit-code: 1
```

Require clean scans before merging. Pair with `syft` to generate SBOM artifacts.

## 5. Release Workflow (Multi-Arch + Provenance)

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          provenance: true
          sbom: true
          push: true
          tags: |
            ghcr.io/acme/api:${{ github.sha }}
            ghcr.io/acme/api:${{ github.ref_name }}
```

`provenance: true` uploads SLSA build metadata; GitHub can verify signatures automatically.

## 6. Secrets Management

- Use repository/environment secrets for registry credentials, signing keys, API tokens.
- Mask `docker login` output by relying on `docker/login-action` (never run `docker login` manually with `echo`).
- For multiple registries, add separate login steps keyed by secret names.

## 7. Test Containers Before Publishing

After building, run smoke tests with `docker compose`:

```yaml
      - name: Smoke test
        run: |
          docker compose -f docker-compose.ci.yaml up -d
          ./scripts/wait-for-health.sh
          npm test
```

Tear down with `docker compose down -v` to avoid leftover volumes.

## 8. Promote Images Automatically

Use environments + approvals:

```yaml
jobs:
  deploy-prod:
    needs: release
    environment:
      name: production
      url: https://status.acme.com
    steps:
      - run: ./scripts/deploy.sh ghcr.io/acme/api:${{ github.ref_name }}
```

Approvers gate promotions while builds remain deterministic.

## 9. Observability Hooks

- Emit `docker/build-push-action` duration metrics to OneUptime via custom events (curl webhook in a final step).
- Track failure rates per stage for reliability retros.

---

With BuildKit, caches, scans, and provenance wired into GitHub Actions, every PR builds the real artifact you ship. Fast feedback for developers, strong guarantees for security.
