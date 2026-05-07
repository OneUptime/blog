# Validation Summary: How to Use Podman for Go Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Go
- Go modules
- Air
- Delve
- VS Code Go extension
- Compose
- PostgreSQL
- Containerfiles / Dockerfiles

## Sources Consulted
- Go release history: https://go.dev/doc/devel/release
- Go modules reference: https://go.dev/ref/mod
- Go coverage documentation: https://go.dev/doc/build-cover
- Docker Official Image packaging for `golang`: https://github.com/docker-library/golang
- Air project documentation: https://github.com/air-verse/air
- Air example configuration: https://github.com/air-verse/air/blob/master/air_example.toml
- Podman compose documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- VS Code Go debugging documentation: https://github.com/golang/vscode-go/wiki/debugging
- Docker Compose application model: https://docs.docker.com/compose/compose-application-model/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post used `golang:1.22` throughout. As of May 7, 2026, Go 1.26 is the current supported release line and Air’s current installation instructions require Go 1.25 or higher. I updated the examples to `golang:1.26` and `golang:1.26-alpine`.
- The post described static binaries as if they were the default result of any Go build. That is too broad. I changed the wording to say Go can compile to static binaries and tied the production-image claim directly to the `CGO_ENABLED=0` example used later in the post.
- The development Containerfile and production multi-stage Containerfile assumed a `go.sum` file would always exist. The tutorial’s sample app only uses the standard library, so `go.sum` may be absent. I changed those snippets to copy `go.mod` only before `go mod download` so the examples work for the sample project.
- The Air config used the deprecated `build.bin` field. Air’s current docs recommend `build.entrypoint` instead. I replaced `bin` with `entrypoint` and corrected the regex example to `"_test\\.go"` to match Air’s documented form.
- The Compose section used the older `podman-compose` command and a legacy `version: "3.8"` header. Podman’s current docs define `podman compose` as the supported entry point, and current Compose docs mark the top-level `version` field as obsolete. I updated the commands to `podman compose`, renamed the example file reference to `compose.yaml`, and removed the obsolete `version` field.
- The coverage example ran `go test` in the container but left `go tool cover` on the host shell because of `&&` placement. I wrapped the coverage command in `sh -c` so both commands execute inside the container as described.
- The Delve command used the older `--api-version=2` form and the VS Code example relied on `remotePath`. Current VS Code Go docs recommend explicitly using `debugAdapter: "dlv-dap"` for remote mode and `substitutePath` mappings. I removed `--api-version=2` from the Delve command and updated the attach configuration accordingly.
- The cross-compilation examples wrote into `bin/...` without ensuring the directory existed. I wrapped each build in `sh -c 'mkdir -p bin && ...'` so the commands work in a clean checkout.

## Review Notes
- The review was documentation-based. The workspace did not have `podman` or `go` installed, so I could not execute the container commands locally.
- The post is now technically consistent with the current Go 1.26 release line and the current Air and VS Code Go documentation as of 2026-05-07.
