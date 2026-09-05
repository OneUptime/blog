# How to Speed Up Repeated ko Builds in CI with `KOCACHE` and Shared Go Caches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Build Cache, Caching, CI/CD, Container Image

Description: Persist Go modules, compiled packages, and ko's image-layer mapping safely to reduce repeat build and registry upload time.

---

There are three distinct opportunities to accelerate a `ko` build:

1. `GOMODCACHE` avoids downloading unchanged Go modules.
2. `GOCACHE` reuses compiled Go packages and test results.
3. `KOCACHE` stores `ko`'s mapping from Go build inputs to the image layer they produced.

`ko` also avoids uploading blobs already present in the destination registry. These mechanisms complement each other; pointing every variable at one directory makes invalidation and permissions harder to reason about.

## Give Each Cache an Explicit Directory

In a CI workspace, use separate paths:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/services
export GOMODCACHE="$PWD/.cache/go-mod"
export GOCACHE="$PWD/.cache/go-build"
export KOCACHE="$PWD/.cache/ko"

mkdir -p "$GOMODCACHE" "$GOCACHE" "$KOCACHE"
ko build ./cmd/api
```

`KOCACHE` must name a directory. With it set, `ko` can use its local input mapping and the layer present in the image registry to skip the underlying `go build` in a matching case. It is not a standalone copy of the registry and does not make an offline build possible.

Go manages the integrity and eviction policy of its own caches. Do not manually copy arbitrary binaries into them.

## Restore Modules Before Downloading

A typical CI order is:

```bash
go mod download
go test ./...
ko build ./cmd/api
```

With a restored module cache, `go mod download` verifies and reuses content. With a restored build cache, tests and the final compile can reuse packages built with compatible inputs. `ko` executes the Go tool in the same environment, so it naturally benefits from those caches.

Do not disable module checksum verification to improve cache hits. `go.sum` and the checksum database policy remain part of dependency integrity.

## Design Cache Keys Around Compatibility

Include inputs that define compatibility:

- runner operating system and architecture;
- Go toolchain version;
- hashes of all relevant `go.sum` and `go.work.sum` files;
- target platform policy;
- CGO state and C toolchain identity when applicable;
- important build tags and `.ko.yaml` changes; and
- a cache format generation you can bump manually.

A key can be layered. Restore a broad Go-version prefix when the exact dependency hash is absent, then save under the exact key after a successful trusted build.

Do not key only on the Git commit. That prevents reuse between adjacent commits, eliminating much of the value. Conversely, a key of only `go-cache` can mix incompatible toolchains and architectures.

## Example with GitHub's Cache Action

This fragment illustrates directory separation; it assumes an earlier trusted step installed `ko` 0.19.1 and authenticated the destination registry. Pin actions according to your organization's dependency policy:

```yaml
- uses: actions/setup-go@v5
  with:
    go-version-file: go.mod
    cache: false

- name: Compute Go environment
  id: go-env
  shell: bash
  run: |
    echo "goversion=$(go env GOVERSION)" >> "$GITHUB_OUTPUT"

- uses: actions/cache@v4
  with:
    path: |
      .cache/go-mod
      .cache/go-build
      .cache/ko
    key: ko-${{ runner.os }}-${{ runner.arch }}-${{ steps.go-env.outputs.goversion }}-${{ hashFiles('**/go.sum', 'go.work.sum', '.ko.yaml') }}
    restore-keys: |
      ko-${{ runner.os }}-${{ runner.arch }}-${{ steps.go-env.outputs.goversion }}-

- name: Build image
  env:
    KO_DOCKER_REPO: registry.example.com/acme/services
    GOMODCACHE: ${{ github.workspace }}/.cache/go-mod
    GOCACHE: ${{ github.workspace }}/.cache/go-build
    KOCACHE: ${{ github.workspace }}/.cache/ko
  run: ko build ./cmd/api
```

Avoid interpolating untrusted branch names into shell commands. The action expressions above are data fields, while the script reads controlled tool output.

`actions/setup-go` can manage Go dependency caching itself. If you use that feature, do not redundantly cache the same Go directories with a second action. You may still cache `KOCACHE` separately.

## Prevent Cache Poisoning

A writable shared cache crosses build trust boundaries. Pull requests from forks or untrusted branches should restore an approved cache but should not overwrite the cache used by protected release jobs.

Practical controls include:

- save caches only after tests succeed on a protected branch;
- separate keys by trust domain and repository;
- never cache Docker config, cloud credentials, `.netrc`, SSH keys, or token-bearing Git configuration;
- keep private module caches within authorized storage and retention boundaries;
- use platform-provided immutable cache entries when available; and
- purge a cache generation after a toolchain compromise.

Go module source code can itself be sensitive when modules are private. Treat a remote cache as source-code storage, not harmless build metadata.

## Keep Build Configuration Deterministic

Cache hits should change time, not output. Avoid wall-clock linker values unless required. Pin the base-image digest, `ko` version, and Go toolchain. Declare build flags in `.ko.yaml` instead of hidden ambient variables.

`KOCACHE` tracks relevant Go inputs, but external generated files and scripts must still be handled correctly. Run code generation before the build and ensure generated content is visible to the input calculation. If a custom pipeline changes files behind `ko`'s back, invalidate the cache while diagnosing.

## Measure Each Layer

Record timings separately:

```bash
time go mod download
time go test ./...
time ko build ./cmd/api
```

Compare cold and warm builds. Use `go env GOCACHE GOMODCACHE` to confirm the process sees expected paths. Verbose Go output can show which packages compile, while registry logs can show whether blobs were mounted or uploaded.

A warm `GOCACHE` can make compilation fast even if `KOCACHE` misses. A `KOCACHE` hit can avoid the Go build entirely but still needs the relevant image layer in the registry. A nearby registry may matter more than cache tuning for large bases.

## Handle Multi-Platform and CGO Builds

Architecture and CGO inputs must not be mixed carelessly. Go's build cache keys include compiler inputs, but CI cache organization should still separate OS/architecture for size, clarity, and native toolchain artifacts.

For CGO, include compiler version and relevant native dependency versions in cache policy. A restored cached result must not hide that the release runner lacks the actual compiler or runtime library contract needed for a clean build.

Periodically run a cold release rehearsal. It proves the repository and declared dependencies can build without an old cache masking missing setup.

## Conclusion

Persist module downloads, Go build artifacts, and `KOCACHE` as three understood layers. Key them by compatible toolchains and dependency state, restrict who can save trusted caches, exclude credentials, and measure cold as well as warm builds. `ko` will also reuse remote registry blobs, producing a fast path without changing the digest of a deterministic build.

## Official Documentation

- [ko: Build Cache](https://ko.build/features/build-cache/)
- [ko: Configuration and `KOCACHE`](https://ko.build/configuration/)
- [Go: Build and Test Caching](https://pkg.go.dev/cmd/go#hdr-Build_and_test_caching)
- [Go: Module Cache](https://go.dev/ref/mod#module-cache)
- [GitHub Actions: Dependency Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
