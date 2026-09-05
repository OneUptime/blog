# How to Build Multiple Go Services from a Monorepo with ko and Multiple `go.mod` Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Go Modules, Monorepo, Container Image, Configuration

Description: Dispatch ko builds to the correct module directory for several Go services while keeping caches, bases, and release output explicit.

---

A monorepo does not need one giant Go module to use `ko`. Its `.ko.yaml` `builds` entries can set a different `dir` for each `go.mod`. `ko` then runs the Go tool in the module that owns the requested command.

The key is to match the CLI target, `dir`, and `main` paths unambiguously. Running a build from an arbitrary subdirectory or relying on whichever `go.mod` the Go tool finds first makes failures difficult to reproduce.

## Use a Predictable Layout

Consider this repository:

```text
.
├── .ko.yaml
├── go.work
└── services
    ├── catalog
    │   ├── go.mod       # module example.com/acme/catalog
    │   ├── go.sum
    │   └── cmd/api/main.go
    └── billing
        ├── go.mod       # module example.com/acme/billing
        ├── go.sum
        └── cmd/worker/main.go
```

A `go.work` file is useful for local development across modules:

```go
go 1.26

use (
	./services/catalog
	./services/billing
)
```

It is not a replacement for module requirements. Each service still needs a valid, independently understandable `go.mod`.

## Configure One Build Entry per Command

At the repository root, create `.ko.yaml`. Replace the digest placeholders with real SHA-256 digests (64 hexadecimal characters) and the example registry paths with repositories you can access. The linker flags assume each command imports its module's `internal/version` package with a string variable such as `var Commit = "dev"`, and that the checkout has Git commit metadata:

```yaml
defaultBaseImage: cgr.dev/chainguard/static@sha256:BASE_INDEX_DIGEST

builds:
  - id: catalog-api
    dir: ./services/catalog
    main: ./cmd/api
    env:
      - CGO_ENABLED=0
    ldflags:
      - -s
      - -w
      - -X=example.com/acme/catalog/internal/version.Commit={{.Git.FullCommit}}

  - id: billing-worker
    dir: ./services/billing
    main: ./cmd/worker
    env:
      - CGO_ENABLED=0
    ldflags:
      - -s
      - -w
      - -X=example.com/acme/billing/internal/version.Commit={{.Git.FullCommit}}

baseImageOverrides:
  example.com/acme/billing/cmd/worker: registry.example.com/base/billing@sha256:BILLING_BASE_DIGEST
```

`dir` tells `ko` where to execute `go build`; `main` is relative to that directory. `dir` is relative to the working directory of the `ko` process; the command path is the result of joining `dir` and `main`. The friendly `id` does not become the Go import path or image name.

## Invoke ko from the Contracted Root

Run from the repository root:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/services
mkdir -p dist

ko build \
  ./services/catalog/cmd/api \
  ./services/billing/cmd/worker \
  --image-refs=dist/images.txt
```

`ko` matches each local target to the configured `dir`, makes it relative to that module, and qualifies the package using the module's import path. Fully qualified targets are also supported:

```bash
ko build \
  example.com/acme/catalog/cmd/api \
  example.com/acme/billing/cmd/worker
```

Use `go list` inside each module to verify the canonical values:

```bash
go -C services/catalog list -f '{{.ImportPath}} {{.Name}}' ./cmd/api
go -C services/billing list -f '{{.ImportPath}} {{.Name}}' ./cmd/worker
```

Both commands must be `main` packages.

## Decide How CI Uses `go.work`

Go workspace mode can make one module resolve another module to local source. That is useful when services intentionally release together. It can also make an independent module build pass only because an unpublished sibling checkout exists.

Choose and test a policy:

- Coordinated monorepo release: check in `go.work` and, if Go generates it, `go.work.sum`, then build from the root.
- Independently releasable modules: test each with `GOWORK=off` as well as any root integration tests.

For example:

```bash
GOWORK=off go -C services/catalog test ./...
GOWORK=off go -C services/billing test ./...
go test ./services/catalog/... ./services/billing/...
```

Do not generate an untracked `go.work` implicitly in release CI.

## Cache Every Module's Dependency Metadata

For dependency-aware cache restoration, include module and workspace configuration as well as all existing sum files:

```text
services/catalog/go.mod
services/catalog/go.sum
services/billing/go.mod
services/billing/go.sum
go.work
go.work.sum
.ko.yaml
```

An exact hash changes the restore key when these dependency inputs change; source-only edits need not change it. `go.work.sum` is only present when the workspace needs checksums not already recorded in the modules' sum files. For very large repositories, per-module test jobs can use narrower keys, while the final multi-service release job uses the union.

Share `GOCACHE` and `GOMODCACHE` only within trusted environments. Go keys build-cache entries by compiler and build inputs, and the module cache stores downloaded module content, so separate Go-version and platform restore keys are an optimization rather than a general correctness requirement. `KOCACHE` can accelerate repeated `ko` image builds but should also be restored by a key that includes `.ko.yaml` and target platform policy.

## Keep Image Naming Collision-Safe

Monorepos often repeat directory names such as `api`, `worker`, and `server`. `ko`'s default name includes a hash of the full import path, preventing collisions. Do not switch to `--base-import-paths` without inventorying duplicates.

If human-readable hierarchy is required, use `--preserve-import-paths` and confirm the registry accepts nested paths. Capture `dist/images.txt`; do not attempt to guess the generated repository for each package in downstream automation.

For a deterministic service-to-reference map, build each service in a named CI step with its own image-reference file:

```bash
ko build ./services/catalog/cmd/api --image-refs=dist/catalog.txt
ko build ./services/billing/cmd/worker --image-refs=dist/billing.txt
```

## Build Only Changed Services Carefully

A path filter that sees a change under `services/catalog` can select the catalog image. Shared modules, root tooling, `.ko.yaml`, base digests, `go.work`, and `go.work.sum` may affect several services. Maintain an explicit dependency graph or conservatively rebuild all services when shared inputs change.

Skipping a build is a release decision, not merely a CI optimization. The existing digest still identifies the old image when inputs change, but reusing it for a new release requires checking whether those changes affect the service.

## Verify Independent Runtime Contracts

Each service may use a different base, port, user, and native dependency. After the build:

1. Inspect every digest in the reference files.
2. Run the binary's version command, if the service implements one; `ko` does not add one.
3. Smoke-test the service on every supported platform.
4. Confirm its configured base and nonroot permissions.
5. Retain a manifest that maps logical service name to digest.

Do not infer that a successful catalog build validates the billing module simply because both use the same Go cache.

## Conclusion

Use one `.ko.yaml` at a stable repository root, give each command a build entry whose `dir` points at its module, validate canonical import paths with `go list`, and decide explicitly whether release builds use `go.work`. Preserve collision-safe names and separate digest outputs when downstream automation needs a reliable service mapping.

## Official Documentation

- [ko: Multiple Module Configuration](https://ko.build/configuration/#overriding-go-build-settings)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [Go: Workspaces Tutorial](https://go.dev/doc/tutorial/workspaces)
- [Go Modules Reference](https://go.dev/ref/mod)
- [Go: `go` Command `-C` Flag](https://pkg.go.dev/cmd/go)
