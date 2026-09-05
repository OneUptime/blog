# How to Configure Different Base Images and Build Flags for Multiple Go Commands in `.ko.yaml`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Configuration, Base Images, Monorepo, Container Image

Description: Configure per-command Go flags, linker settings, environments, and base image overrides in one explicit ko project file.

---

A repository often contains several Go commands with different runtime and compiler requirements. An API can use the default static base, a migration tool may need a shell, and a collector may require build tags. `.ko.yaml` supports this without separate Dockerfiles through `builds`, defaults, and `baseImageOverrides`.

The configuration keys match build targets, not arbitrary friendly IDs. Understanding how `dir`, `main`, module import paths, and precedence interact prevents a build from silently receiving the wrong settings.

## Use an Explicit Repository Layout

Consider one Go module:

```text
.
├── go.mod                 # module example.com/acme/platform
├── .ko.yaml
└── cmd
    ├── api
    │   └── main.go
    ├── migrate
    │   └── main.go
    └── collector
        └── main.go
```

Verify the import paths as the Go tool sees them:

```bash
go list -f '{{.ImportPath}} {{.Name}}' ./cmd/api ./cmd/migrate ./cmd/collector
```

Each must report package name `main`.

## Configure Common Defaults and Per-Build Overrides

Use this `.ko.yaml` as a starting point. Replace the example registry names and digest placeholders with real image references before building; a SHA-256 digest needs 64 hexadecimal characters. The linker examples assume the commands import `internal/version` with string variables named `Component` and `Version` that are uninitialized or initialized with constant string expressions:

```yaml
defaultBaseImage: cgr.dev/chainguard/static@sha256:STATIC_INDEX_DIGEST

defaultEnv:
  - CGO_ENABLED=0

defaultFlags:
  - -v

defaultLdflags:
  - -s
  - -w

builds:
  - id: api
    dir: .
    main: ./cmd/api
    ldflags:
      - -s
      - -w
      - -X=example.com/acme/platform/internal/version.Component=api

  - id: migrate
    dir: .
    main: ./cmd/migrate
    flags:
      - -v
      - -tags
      - migrations

  - id: collector
    dir: .
    main: ./cmd/collector
    env:
      - CGO_ENABLED=1
      - CC=gcc
    flags:
      - -v
      - -tags
      - nativecollector

baseImageOverrides:
  example.com/acme/platform/cmd/migrate: registry.example.com/base/migrate@sha256:MIGRATE_DIGEST
  example.com/acme/platform/cmd/collector: registry.example.com/base/collector@sha256:COLLECTOR_DIGEST
```

Build all three in one invocation:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/platform
ko build ./cmd/api ./cmd/migrate ./cmd/collector
```

`ko` chooses a `builds` entry by the import path corresponding to `dir` joined with `main`. The `id` is an internal identifier and does not replace the package match.

## Understand Default Versus Per-Build Precedence

Defaults are fallbacks, not arrays that are always appended. If a build supplies a nonempty `flags` list, those values are used instead of `defaultFlags`. The same rule applies to `ldflags` and `defaultLdflags`. In ko 0.19.1, an empty list (`[]`) also falls back to the default; it does not clear it. Repeat required common values in a specialized entry, or generate the file from an intentionally reviewed source if repetition becomes dangerous. `ko` adds `-trimpath` by default independently, so it does not need to be duplicated in these lists.

Environment behavior is similarly deliberate. System environment values have lower precedence. A build's `env` is used when nonempty; otherwise `defaultEnv` is used. In the example, the collector explicitly enables CGO and therefore must also state any other default environment values it still needs.

Run a verbose canary build after changing precedence:

```bash
ko --verbose build ./cmd/collector
```

Do not put secrets in `.ko.yaml`. Build environment values can affect module fetching and compilation, and the file belongs in source control.

## Tokenize Go Flags Correctly

The `flags` list represents arguments to `go build`. A tag option can be expressed as separate items:

```yaml
flags:
  - -v
  - -tags
  - netgo,osusergo
```

Linker flags belong under `ldflags`:

```yaml
ldflags:
  - -s
  - -w
  - -X=example.com/acme/platform/internal/version.Version={{.Env.VERSION}}
```

`ko` supports templates for environment and Git values in build flags and linker flags. In version 0.19.1, a missing `.Env` key fails template evaluation, while a variable that is present but empty still renders an empty value. Validate required inputs in the CI script before invoking `ko` so either case fails at a clear boundary:

```bash
: "${VERSION:?VERSION must be set and nonempty}"
export VERSION
ko build ./cmd/api
```

Command-line `--ldflags` take precedence over `.ko.yaml` linker flags. Use that for a controlled override, not as a second source of release truth.

## Match Base Overrides by Full Import Path

`baseImageOverrides` keys are the fully qualified import paths. A relative command used on the CLI still resolves to that full path. Copy the value from `go list` rather than hand-constructing it.

The base image supplies runtime files, not build-time headers. Enabling CGO for the collector means the CI worker also needs `gcc` and development libraries. The compiler and development libraries must target the selected container OS and architecture; cross-compiling requires a suitable C cross-compiler in `CC`. If the resulting binary is dynamically linked, the collector base needs the corresponding runtime loader and libraries.

Pin each base to an index or manifest digest appropriate for the selected platforms. A tag update does not alter an already published application image, but an unpinned tag makes later rebuilds less reproducible.

## Use Multiple Modules with `dir`

When commands live under different `go.mod` files, set `dir` to the module directory and make `main` relative to it:

```yaml
builds:
  - id: public-api
    dir: ./services/public-api
    main: ./cmd/server
  - id: worker
    dir: ./services/worker
    main: ./cmd/worker
```

Paths are relative to the working directory where `ko` runs. Invoke it from the repository root if the checked-in configuration assumes the root.

## Verify Each Produced Image

Capture references:

```bash
mkdir -p dist
ko build ./cmd/api ./cmd/migrate ./cmd/collector \
  --image-refs=dist/images.txt
```

For each digest, inspect its base-dependent behavior:

- API: starts as nonroot and serves health checks.
- Migration: required shell or client executable exists, and the tool exits cleanly.
- Collector: native library loads and the supported architecture runs.

Image size is a useful regression signal but not proof that the correct base was selected. Query config, layers, and runtime behavior.

## Conclusion

Use `.ko.yaml` to make each command's build contract visible. Match entries by real Go import path, understand that per-build arrays replace defaults, pin per-command bases, and keep build-time dependencies separate from runtime contents. A small explicit matrix is easier to review than ambient environment variables and one oversized base shared by every service.

## Official Documentation

- [ko: Configuration](https://ko.build/configuration/)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [Go: `go list` Command](https://pkg.go.dev/cmd/go#hdr-List_packages_or_modules)
- [Go: `go build` Command](https://pkg.go.dev/cmd/go#hdr-Compile_packages_and_dependencies)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
