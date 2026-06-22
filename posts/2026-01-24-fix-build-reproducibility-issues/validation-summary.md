# Validation Summary: How to Fix 'Build Reproducibility' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- npm and package-lock.json
- pip and pip-tools
- Go modules and Go builds
- Docker and BuildKit
- GNU tar
- Bazel and rules_go
- Nix and buildGoModule
- GitHub Actions

## Sources Consulted
- npm CLI documentation for `npm ci`: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- npm CLI documentation for `npm install` and package-lock behavior: https://docs.npmjs.com/cli/v11/commands/npm-install/
- pip secure installs and hash-checking mode: https://pip.pypa.io/en/stable/topics/secure-installs/
- pip-tools `pip-compile` CLI documentation: https://pip-tools.readthedocs.io/en/stable/cli/pip-compile/
- Go command documentation: https://pkg.go.dev/cmd/go
- Go release policy and release history: https://go.dev/doc/devel/release
- Docker Dockerfile reference for `ARG`: https://docs.docker.com/reference/dockerfile/
- Docker Build reproducible builds documentation: https://docs.docker.com/build/ci/github-actions/reproducible-builds/
- Docker official `golang` image manifest: https://github.com/docker-library/official-images/blob/master/library/golang
- Bazel rules_go core rules documentation: https://github.com/bazel-contrib/rules_go/blob/master/docs/go/core/rules.md
- Nixpkgs `buildGoModule` documentation: https://github.com/NixOS/nixpkgs/blob/master/doc/languages-frameworks/go.section.md
- NixOS release notes for `buildGoModule` `vendorHash`: https://nixos.org/manual/nixos/stable/release-notes
- GNU tar local `--help` output for `--mtime`, `--owner`, `--group`, `--numeric-owner`, `--no-recursion`, and `--null`
- Docker CLI local `docker build --help` output for `--build-arg`

## Issues Found
- The npm section said `npm ci` generates `package-lock.json`. `npm ci` requires an existing lockfile and never writes package files, so the snippet now uses `npm install` to generate or update the lockfile and `npm ci` for CI installs.
- The Dockerfile used `${VERSION}` in `go build -ldflags` without declaring `ARG VERSION`. Added `ARG VERSION=dev` so the build argument has a defined default.
- The Dockerfile used `golang:1.21-alpine`, which is no longer one of the supported Go release lines as of June 19, 2026. Updated it to `golang:1.26-alpine`, which is present in the official image manifest.
- The Go modules section overstated `go.sum` as making builds reproducible by default. Narrowed the claim to verifiable dependency downloads.
- The Bazel `go_binary` example used `stamp = 0`, but current `rules_go` `go_binary` documentation does not define a `stamp` attribute. Removed the invalid attribute.
- The Nix section overstated Nix as providing fully reproducible builds. Narrowed the claim to pinned inputs and pure build environments.
- The Nix `buildGoModule` example set `outputHashMode = "recursive"` on the final package derivation. `buildGoModule` already uses `vendorHash` for the dependency fixed-output derivation; setting only `outputHashMode` on the package is incorrect and incomplete, so it was removed.
- The Go file-ordering snippet used `package main` without a `main` function and referenced an undefined `processFile` function. Changed it to a library-style package and added a small placeholder function so the snippet is type-correct.

## Review Notes
- The GitHub Actions container image digest is illustrative and intentionally abbreviated. In production, it should be replaced with a complete digest.
- The Nix hashes are placeholders and should be replaced with real hashes when used.
