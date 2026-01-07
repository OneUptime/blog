# How to Plug Docker into GitHub Actions for Fast, Secure CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, CI/CD, GitHub Actions, Security, DevOps, Automation

Description: Learn how to build, cache, scan, and publish Docker images inside GitHub Actions using BuildKit, buildx, provenance metadata, and vulnerability checks that keep pipelines fast and compliant.

---

GitHub Actions plus Docker gives you a portable CI pipeline-if you tame caching, secrets, and scans. Here’s an end-to-end workflow you can copy.

## 1. Reusable Workflow Layout

```
.github/workflows/
  docker-build.yml
  docker-release.yml
```

- `docker-build.yml`: run on every PR for testing.
- `docker-release.yml`: publish multi-arch images on main tags/releases.

## 2. Enable BuildKit and buildx

This workflow sets up Docker buildx with BuildKit for advanced caching, multi-platform builds, and SBOM generation. It also authenticates to GitHub Container Registry.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Checkout the repository code
      - uses: actions/checkout@v4

      # Set up Docker buildx for advanced build features (caching, multi-arch)
      - uses: docker/setup-buildx-action@v3

      # Authenticate to GitHub Container Registry
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}         # GitHub username of the workflow runner
          password: ${{ secrets.GITHUB_TOKEN }} # Auto-generated token for the workflow
```

`setup-buildx` creates a builder that supports cache exports, multi-arch builds, and SBOMs.

## 3. Layered Cache Strategy

This configuration implements a local cache strategy for Docker builds. The cache is stored between runs, dramatically speeding up subsequent builds.

```yaml
      # Restore cached Docker layers from previous builds
      - uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: ${{ runner.os }}-buildx-${{ github.sha }}  # Unique key per commit
          restore-keys: |                                  # Fallback to any recent cache
            ${{ runner.os }}-buildx-

      # Build the Docker image using cached layers
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile
          push: false                                      # Don't push PR builds
          tags: ghcr.io/acme/api:pr-${{ github.event.number }}
          cache-from: type=local,src=/tmp/.buildx-cache   # Read cache from this path
          cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max  # Write to temp path

      # Rotate the cache (prevents cache from growing unbounded)
      - name: Move cache
        run: |
          rm -rf /tmp/.buildx-cache
          mv /tmp/.buildx-cache-new /tmp/.buildx-cache
```

CI hits warm caches even on short-lived runners.

## 4. Security Scans Inline

Automatically scan every build for known vulnerabilities. This step fails the pipeline if critical or high severity CVEs are found.

```yaml
      # Scan the built image for security vulnerabilities
      - name: Scan image
        uses: aquasecurity/trivy-action@0.18.0
        with:
          image-ref: ghcr.io/acme/api:pr-${{ github.event.number }}
          severity: CRITICAL,HIGH  # Only report serious vulnerabilities
          exit-code: 1             # Fail the build if vulnerabilities found
```

Require clean scans before merging. Pair with `syft` to generate SBOM artifacts.

## 5. Release Workflow (Multi-Arch + Provenance)

This workflow builds and pushes multi-architecture images with SLSA provenance for supply chain security. It runs on release tags.

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read      # Read repository contents
      packages: write     # Push to GitHub Container Registry
      id-token: write     # Sign images with OIDC (for provenance)
    steps:
      - uses: actions/checkout@v4

      # QEMU enables cross-architecture builds (ARM on x86 runners)
      - uses: docker/setup-qemu-action@v3

      # buildx provides multi-platform build support
      - uses: docker/setup-buildx-action@v3

      # Authenticate to GitHub Container Registry
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Build and push multi-arch images with provenance
      - uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64  # Build for both Intel and ARM
          provenance: true   # Generate SLSA provenance attestation
          sbom: true         # Generate Software Bill of Materials
          push: true         # Push to registry
          tags: |
            ghcr.io/acme/api:${{ github.sha }}       # Immutable SHA tag
            ghcr.io/acme/api:${{ github.ref_name }}  # Version or branch tag
```

`provenance: true` uploads SLSA build metadata; GitHub can verify signatures automatically.

## 6. Secrets Management

- Use repository/environment secrets for registry credentials, signing keys, API tokens.
- Mask `docker login` output by relying on `docker/login-action` (never run `docker login` manually with `echo`).
- For multiple registries, add separate login steps keyed by secret names.

## 7. Test Containers Before Publishing

After building, run smoke tests with `docker compose` to verify the image works before pushing to production.

```yaml
      # Run integration tests against the built container
      - name: Smoke test
        run: |
          # Start containers in detached mode using CI-specific compose file
          docker compose -f docker-compose.ci.yaml up -d
          # Wait for services to report healthy (custom script)
          ./scripts/wait-for-health.sh
          # Run the test suite against the running containers
          npm test
```

Tear down with `docker compose down -v` to avoid leftover volumes.

## 8. Promote Images Automatically

Use environments with approval requirements to gate production deployments while keeping the build process fully automated.

```yaml
jobs:
  deploy-prod:
    needs: release            # Wait for release job to complete successfully
    environment:
      name: production        # Requires approval from designated reviewers
      url: https://status.acme.com  # Link shown in PR/deployment status
    steps:
      # Deploy the released image to production
      - run: ./scripts/deploy.sh ghcr.io/acme/api:${{ github.ref_name }}
```

Approvers gate promotions while builds remain deterministic.

## 9. Observability Hooks

- Emit `docker/build-push-action` duration metrics to OneUptime via custom events (curl webhook in a final step).
- Track failure rates per stage for reliability retros.

---

With BuildKit, caches, scans, and provenance wired into GitHub Actions, every PR builds the real artifact you ship. Fast feedback for developers, strong guarantees for security.
