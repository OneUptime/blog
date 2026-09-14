# Persist BuildKit Package Cache Mounts in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, GitHub Action, Caching, CI/CD

Description: Persist BuildKit package cache mounts across GitHub Actions runners with an explicit extraction and injection workflow and correct immutable archive keys.

---

A BuildKit cache mount is mutable storage owned by a builder. On a persistent laptop builder, later `RUN` operations can reuse its downloaded packages. A new GitHub-hosted runner normally starts without that builder state.

Exporting BuildKit layer cache with `type=gha,mode=max` does not, by default, export the contents of cache mounts. Docker explicitly documents this distinction and points to `reproducible-containers/buildkit-cache-dance` as a workaround that extracts and injects mount data. [Docker cache management in GitHub Actions](https://docs.docker.com/build/ci/github-actions/cache/).

## Identify Which Cache Is Missing

Suppose dependency installation uses:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build
```

An unchanged lockfile may allow the entire `npm ci` operation to hit the exported layer cache. In that case npm never starts, so the empty package cache mount is invisible.

After a lockfile change, installation must execute. The package cache mount is now relevant: a persistent mount can supply unchanged downloads, while an empty one requires network access. Test this second case when diagnosing mount persistence. An identical-build cache hit only tests whole-operation reuse.

## Restore Files, Inject the Mount, Then Build

The following workflow caches a runner directory separately from the BuildKit operation cache. The cache-dance action injects those files into the selected builder and extracts the resulting mount in its post-job phase.

```yaml
name: Build with package download cache
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - uses: docker/setup-buildx-action@v4
        id: builder
      - name: Restore package cache archive
        uses: actions/cache@v6
        id: packages
        with:
          path: .build-package-cache/npm
          key: npm-mount-v1-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('package-lock.json') }}-${{ github.run_id }}-${{ github.run_attempt }}
          restore-keys: |
            npm-mount-v1-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('package-lock.json') }}-
            npm-mount-v1-${{ runner.os }}-${{ runner.arch }}-
      - name: Inject and later extract npm cache mount
        uses: reproducible-containers/buildkit-cache-dance@v3
        with:
          builder: ${{ steps.builder.outputs.name }}
          cache-map: |
            {
              ".build-package-cache/npm": "/root/.npm"
            }
      - uses: docker/build-push-action@v7
        with:
          builder: ${{ steps.builder.outputs.name }}
          context: .
          load: true
          tags: app:ci
          cache-from: type=gha,scope=app-linux-amd64
          cache-to: type=gha,scope=app-linux-amd64,mode=max
```

Add `.build-package-cache` to `.dockerignore`. Otherwise a broad `COPY . .` can copy restored downloads into the image and make unrelated cache contents part of the build input.

The cache-map keys are runner-side directories and the values are mount targets inside the Docker build. If the Dockerfile sets an explicit mount `id`, use the action's object mapping form to supply the same ID. [Cache-dance mapping documentation](https://github.com/reproducible-containers/buildkit-cache-dance#cachemap-options).

Use reviewed immutable action SHAs in production. Cache-dance is a third-party workaround linked by Docker, not a built-in guarantee from the `gha` exporter.

## Preserve the Post-Job Order

The combined cache action is declared before cache-dance. During cleanup, cache-dance extracts the mount before the cache action saves the runner directory. Moving a standalone `actions/cache/save` step immediately after the build would run before that extraction and can archive old or empty content.

The unique run suffix lets successful jobs publish an updated snapshot; GitHub cache entries cannot be modified under an existing key. If you choose a stable key instead, an exact hit may leave newly downloaded packages unpublished. That can be an acceptable storage tradeoff, but make it deliberate. [Cache action update guidance](https://github.com/actions/cache/blob/main/tips-and-workarounds.md#update-a-cache).

## Match Builder, User, and Mount Identity

The injection step and actual build must select the same builder. A correct host archive does not help if a later action creates another builder.

Likewise, `/root/.npm` is appropriate for the root user in this example. A non-root image might use another home directory or an explicit npm cache location. Verify the package manager's configured directory inside the build environment.

Mount options also matter. Explicit IDs, target paths, sharing mode, and ownership must match the expected usage. For package managers requiring exclusive access, use the documented locking approach rather than allowing concurrent writers to corrupt a mutable repository.

## Check the Failure Cases

Run two fresh-runner builds. For the second, make a legitimate lockfile change that forces `npm ci` to execute. Verify that the host archive restored, mount injection used the selected builder, and npm reused available downloads while fetching the new dependency.

Then try an empty archive. The build must still succeed with network access; cache contents are disposable and can be garbage-collected. Docker's cache-mount reference explicitly requires builds to tolerate arbitrary cache contents. [Dockerfile cache mounts](https://docs.docker.com/reference/dockerfile/#run---mounttypecache).

Track archive size and upload/download time. If transferring a large package cache costs more than fetching the small changed dependency set, keep only the layer cache or use a persistent isolated builder. Persistence is useful only when it reduces total build time without weakening correctness.

## References

- [Docker GitHub Actions cache management](https://docs.docker.com/build/ci/github-actions/cache/)
- [Cache-dance action](https://github.com/reproducible-containers/buildkit-cache-dance)
- [GitHub cache immutability](https://github.com/actions/cache/blob/main/tips-and-workarounds.md#update-a-cache)
- [Dockerfile cache mount reference](https://docs.docker.com/reference/dockerfile/#run---mounttypecache)
