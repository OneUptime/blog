# Cache Dependencies in Woodpecker Without Cross-Branch Contamination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Caching, npm, Maven, Go

Description: Build isolated Woodpecker dependency caches keyed by forge, repository, execution ref, platform, toolchain, and dependency manifests.

---

Woodpecker's workspace lasts for one workflow, so package-manager downloads disappear after the pipeline unless you mount persistent storage or use a cache service. A cache shared by every branch under one path is fast but risky: incompatible lockfiles, toolchains, platforms, or untrusted changes can affect later builds.

The safe pattern is a dedicated persistent cache root with keys derived from forge, repository, execution ref, platform, toolchain, and dependency manifests. Treat the cache as disposable acceleration. A build must remain correct when the cache is empty.

## Start with the Storage Boundary

On a trusted repository using the Docker backend, mount a dedicated host directory:

~~~yaml
steps:
  - name: dependencies
    image: alpine:3.22
    volumes:
      - /var/lib/woodpecker/dependency-cache:/cache
    commands:
      - test -d /cache
~~~

Woodpecker requires host paths to be absolute and restricts volumes to trusted repositories. Do not mount a user's home directory, Docker data root, or a general build directory. The cache mount should contain nothing required for correctness and no credentials.

The bind-mounted directory is local to that Docker host unless the host path itself uses shared storage. A Docker named volume is also possible and, with Docker's default `local` driver, is host-local; an external volume driver can provide shared storage. On Kubernetes, create a PVC and reference its claim name. Concurrent workflows need a storage class and access mode that support the intended writers; the Woodpecker backend documentation calls out `ReadWriteMany` for a PVC shared concurrently.

## Design the Cache Key

At minimum include:

- forge and repository identity, so normal cache lookup does not accidentally select another project's namespace;
- execution-ref identity, for strict isolation between branches, pull requests, and tags;
- operating system and architecture;
- language/toolchain major version;
- a hash of every dependency descriptor and lockfile.

Never use a raw ref name as a directory. Names can contain slashes and punctuation, creating unintended directory hierarchies. Hashing produces a fixed safe path component:

~~~sh
scope="$(printf '%s' "$CI_FORGE_URL|$CI_REPO|$CI_COMMIT_REF|$CI_SYSTEM_PLATFORM" | sha256sum | cut -c1-24)"
~~~

Then add an ecosystem-specific dependency hash. Ref isolation is the conservative default. Woodpecker's `CI_COMMIT_BRANCH` is the target branch in pull-request pipelines, so it does not isolate PR source branches; `CI_COMMIT_REF` identifies the branch, tag, or pull-request ref against which the workflow runs. For package managers whose caches are content-addressed and verified, mature teams sometimes omit the ref component to share identical lockfile caches. Do that only after analyzing concurrent writes and poisoning risk.

## npm: Cache Downloads, Recreate node_modules

`npm ci` is designed for clean, lockfile-based installation. Cache npm's download store, not a mutable `node_modules` tree copied between branches.

~~~yaml
steps:
  - name: npm-test
    image: node:24-alpine
    volumes:
      - /var/lib/woodpecker/dependency-cache:/cache
    commands:
      - scope="$(printf '%s' "$CI_FORGE_URL|$CI_REPO|$CI_COMMIT_REF|$CI_SYSTEM_PLATFORM|node24" | sha256sum | cut -c1-24)"
      - deps="$(sha256sum package-lock.json | cut -d' ' -f1)"
      - cache_dir="/cache/npm/$scope/$deps"
      - mkdir -p "$cache_dir"
      - npm ci --cache "$cache_dir" --prefer-offline
      - npm test
~~~

Why each component matters:

- `package-lock.json` changes create a new cache namespace.
- `node24` prevents an intentional runtime-major upgrade from inheriting the same bucket.
- platform separates native-package downloads.
- `npm ci` removes and recreates `node_modules` according to the lockfile.
- `--prefer-offline` still lets npm fetch missing data rather than making the cache mandatory.

npm documents its cache as opaque, content-addressable data and provides `npm cache verify` for integrity and garbage collection. Do not manipulate its internal files. If verification fails, delete only the affected namespaced directory and retry cold.

For npm workspaces, include the root lockfile and any configuration that changes registry or install behavior. Never cache an `.npmrc` containing credentials.

## Maven: Isolate the Local Repository

Maven's local repository defaults under the user's home directory. Point it at the namespaced cache with `maven.repo.local`:

~~~yaml
steps:
  - name: maven-test
    image: maven:3.9-eclipse-temurin-25
    volumes:
      - /var/lib/woodpecker/dependency-cache:/cache
    commands:
      - scope="$(printf '%s' "$CI_FORGE_URL|$CI_REPO|$CI_COMMIT_REF|$CI_SYSTEM_PLATFORM|maven3-jdk25" | sha256sum | cut -c1-24)"
      - deps="$(find . -type f \( -name pom.xml -o -path './.mvn/*' \) -exec sha256sum {} + | sort | sha256sum | cut -d' ' -f1)"
      - repo="/cache/maven/$scope/$deps/repository"
      - mkdir -p "$repo"
      - mvn -B -Dmaven.repo.local="$repo" verify
~~~

The example hashes all matching POMs and root `.mvn` files present in the workspace, not only the root POM. Adjust the descriptor list when the repository uses version catalogs, generated POMs, or additional settings that affect resolution.

Do not place a credential-bearing `settings.xml` in the shared repository. Inject repository credentials at runtime through a protected settings file or secret-aware mechanism, and ensure the persistent cache contains only downloaded artifacts and metadata.

Maven repositories can contain mutable snapshots. Strict ref and manifest isolation limits contamination but does not make remote snapshots immutable. For reproducible releases, prefer fixed release versions. A fail-on-mismatch repository checksum policy detects transfer errors, but remote-provided checksums do not authenticate artifacts or validate an already-writable local cache. If cache tampering is in scope, verify resolved artifacts against independently trusted checksums or signatures, or rebuild releases from an empty local repository.

If concurrent jobs can write the same local repository, do not rely on Maven 3's default locking: it coordinates threads within one JVM, not the separate Maven processes created by concurrent workflows. Serialize writers or use per-run writable repositories populated from a read-only cache. An explicitly configured file-lock implementation can coordinate processes only on filesystems with reliable advisory locking; multi-host storage needs distributed coordination or a cache service designed for it.

## Go: Separate Module and Build Caches

Go has two relevant caches:

- `GOMODCACHE` stores downloaded modules;
- `GOCACHE` stores build outputs.

Keep them separate because they have different cleanup and compatibility behavior:

~~~yaml
steps:
  - name: go-test
    image: golang:1.26
    volumes:
      - /var/lib/woodpecker/dependency-cache:/cache
    commands:
      - scope="$(printf '%s' "$CI_FORGE_URL|$CI_REPO|$CI_COMMIT_REF|$CI_SYSTEM_PLATFORM|go1.26" | sha256sum | cut -c1-24)"
      - deps="$({ sha256sum go.mod; if [ -f go.sum ]; then sha256sum go.sum; fi; } | sha256sum | cut -d' ' -f1)"
      - export GOMODCACHE="/cache/go/$scope/$deps/mod"
      - export GOCACHE="/cache/go/$scope/$deps/build"
      - mkdir -p "$GOMODCACHE" "$GOCACHE"
      - go mod download
      - go mod verify
      - go test ./...
~~~

In a multi-module repository, hash every `go.mod` and any `go.sum`, plus the active `go.work` and `go.work.sum` when present. At a Go 1.25 or newer workspace root, use `go test work` to test every workspace module, or test explicit module-directory patterns; `go test ./...` does not generally span every workspace module. The Go command verifies downloaded module content against `go.sum` and, subject to configuration, the checksum database. `go mod verify` additionally checks that cached module zip files and extracted directories have not changed since download. Do not disable those checks to make a stale cache “work.”

The build cache already records inputs internally, but a toolchain and platform prefix makes operational cleanup and diagnosis simpler. It does not detect changes to C libraries imported with cgo; after those change, run `go clean -cache` or use the `-a` build flag. Otherwise, use `go clean -cache` or remove only the affected build-cache namespace when troubleshooting; clearing the module cache is a separate decision.

## A Reusable Key Script

Duplicating shell key logic across steps invites drift. Check in a non-secret helper:

~~~sh
#!/bin/sh
set -eu

ecosystem="$1"
toolchain="$2"
manifest_digest="$3"

printf '%s' "$CI_FORGE_URL|$CI_REPO|$CI_COMMIT_REF|$CI_SYSTEM_PLATFORM|$ecosystem|$toolchain|$manifest_digest" |
  sha256sum |
  cut -c1-32
~~~

Each step computes the complete manifest digest, then calls:

~~~sh
key="$(./scripts/ci-cache-key npm node24 "$lock_digest")"
cache_dir="/cache/npm/$key"
~~~

Review changes to this helper like workflow changes. A key format change intentionally produces a cold cache and should not delete the previous namespace immediately; keep rollback possible until the new pipeline is proven.

## Pull Requests and Cache Poisoning

Path isolation prevents accidental branch mixing, not malicious writes. A pull request can change commands to overwrite any writable directory visible in the step. If outside contributors are untrusted:

- do not mount a shared writable host cache in PR workflows;
- use ephemeral caches for fork validation;
- dedicate isolated agents or namespaces;
- restore from a read-only cache and avoid saving PR changes;
- populate trusted caches only from protected-branch pipelines.

Woodpecker's “trusted repository” volume gate is coarse: once a workflow is allowed a host mount, review which events can execute that workflow. A hash derived from attacker-controlled metadata is not a security sandbox.

## Concurrency and Atomicity

Two pipelines for the same ref and lockfile may choose the same key. Package-manager caches are designed with different concurrency assumptions, and network filesystems may not honor locks as local disks do.

Safer options include:

1. use workflow concurrency limits for a cache-writing workflow;
2. let each run write a temporary directory on the same filesystem and atomically rename it after success;
3. use per-run write paths plus a separate restore layer;
4. choose an object-backed cache plugin with documented concurrency behavior;
5. accept duplicate downloads rather than risk corrupted state.

Never make deployment wait on a cache upload if the build output itself is already stored elsewhere. Cache save failures should be observable but normally should not invalidate a correct build.

## Eviction and Capacity

Keys containing ref and lock hashes grow without bound unless they expire. Define:

- maximum disk or PVC usage;
- retention for inactive ref namespaces, including closed pull requests;
- retention for old dependency hashes on active refs;
- a low-water mark before cleanup;
- metrics and alerts for cache storage;
- a recovery process that deletes one namespace, not the whole agent.

Measure before deleting. Run a dry inventory such as `du -sh /var/lib/woodpecker/dependency-cache/*` on the agent, then apply a reviewed cleanup policy outside pipeline containers. Woodpecker's Docker backend does not automatically remove images, and likewise your external persistent cache needs explicit lifecycle management.

## Prove That the Cache Is Optional

Test these cases:

1. cold cache on a fresh agent;
2. warm cache on the same ref and lockfile;
3. changed lockfile on the same ref;
4. identical lockfile on a different branch or pull request;
5. different platform or toolchain;
6. concurrent pipelines;
7. corrupt one namespaced entry;
8. fork pull request without persistent write access.

The cold build must pass. A changed dependency manifest must not reuse the old namespace. npm's integrity handling should detect corrupt cache data and either refetch it or fail; `go mod verify` should detect modified module-cache content and fail the build. If manual recovery is needed, delete only the affected namespace and retry cold; never publish an unverified artifact. Maven's ordinary remote checksum policy does not revalidate an already cached artifact; enforce trusted checksums or signatures, or use cold release builds, if that guarantee is required.

## Official Documentation

- [Woodpecker: Volumes](https://woodpecker-ci.org/docs/usage/volumes)
- [Woodpecker: Kubernetes backend volumes](https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes#volumes)
- [Woodpecker: Workflow concurrency](https://woodpecker-ci.org/docs/usage/workflows#concurrency)
- [Woodpecker: Environment variables](https://woodpecker-ci.org/docs/usage/environment)
- [npm cache command](https://docs.npmjs.com/cli/v11/commands/npm-cache)
- [Maven settings localRepository](https://maven.apache.org/settings.html#localRepository)
- [Maven Resolver checksums](https://maven.apache.org/resolver/about-checksums.html)
- [Maven Resolver trusted checksums](https://maven.apache.org/resolver/expected-checksums.html)
- [Go command build and test caching](https://pkg.go.dev/cmd/go#hdr-Build_and_test_caching)
- [Go module cache and authentication](https://go.dev/ref/mod)

## Conclusion

Persist package-manager download caches in a dedicated trusted volume, then namespace them by forge, repository, hashed execution-ref identity, platform, toolchain, and dependency-manifest digest. Cache npm downloads rather than `node_modules`, point Maven at a scoped local repository, and separate Go's module and build caches. Keep untrusted pull requests away from shared writable caches, define eviction, and regularly prove that a completely cold build still succeeds.
