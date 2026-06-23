# Validation Summary: How to Set Up Hot Reloading in Docker for Go with Air

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Air live reload
- Docker
- Docker Compose
- PostgreSQL
- Redis
- Delve
- golangci-lint

## Sources Consulted
- Air GitHub repository and README: https://github.com/air-verse/air
- Air example configuration: https://github.com/air-verse/air/blob/master/air_example.toml
- Air current configuration struct: https://raw.githubusercontent.com/air-verse/air/master/runner/config.go
- Docker Compose documentation: https://docs.docker.com/compose/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference for `depends_on`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose CLI reference for `docker compose up`: https://docs.docker.com/reference/cli/docker/compose/up/
- Go release history: https://go.dev/doc/devel/release
- Go build constraints documentation: https://pkg.go.dev/go/build
- Go official Docker image: https://hub.docker.com/_/golang
- Alpine Linux releases: https://alpinelinux.org/releases/
- golangci-lint installation documentation: https://golangci-lint.run/docs/welcome/install/
- golangci-lint releases: https://github.com/golangci/golangci-lint/releases
- Delve API documentation: https://github.com/go-delve/delve/blob/master/Documentation/api/README.md

## Issues Found
- The Air configuration used non-current nested sections such as `[include]`, `[exclude]`, `[include_ext]`, and `[build.log]`. Current Air config places watch and exclude fields under `[build]`, with names like `include_ext`, `exclude_dir`, and `exclude_regex`. Updated the `.air.toml` examples and explanations accordingly.
- The Air examples used `bin` alone even though current Air recommends `entrypoint`. Added `entrypoint = ["./tmp/main"]` where relevant.
- `kill_delay = 500` was described as milliseconds, but current Air parses `kill_delay` as a duration and normalizes duration values. Changed examples to `kill_delay = "500ms"`.
- The post required Docker Compose v2 but used legacy `docker-compose` commands and a `version: '3.8'` Compose field, which Compose v2 treats as obsolete. Updated commands to `docker compose` and removed the obsolete `version` key.
- The Docker examples used Go 1.22 and Alpine 3.19, both outdated by the review date. Updated Go images to `golang:1.26-bookworm` and the runtime image to `alpine:3.24`.
- The golangci-lint install command used the old raw GitHub install script URL and an outdated v1 release. Updated it to the documented `https://golangci-lint.run/install.sh` URL and a current v2 release.
- The development Dockerfile set `CGO_ENABLED=0`, `GOOS`, and `GOARCH`, which conflicts with the post's later `-race` development build example. Removed those development-image environment variables.
- The production Dockerfile used `COPY go.mod go.sum ./`, which fails for the tutorial's standard-library-only sample if `go.sum` does not exist. Changed it to `COPY go.mod go.sum* ./`.
- The Compose file mounted `./scripts/init-db.sql`, but the tutorial never creates that file. Removed the mount so the sample Compose stack can start from the described project files.
- The Compose file included `AIR_BUILD_DELAY=500`, which is not a documented Air configuration mechanism. Removed it and left build delay in `.air.toml`.
- The Delve example used `dlv debug ... ./...`, which is not appropriate for the single root package sample. Changed it to debug `.` and removed redundant installation because Delve is already installed in the development Dockerfile.
- The Go build-tag example used `log.Println` without importing `log`. Added the missing import.
- The sample Air startup output referenced an old Air and Go version. Updated it to match the refreshed examples.

## Review Notes
- The tutorial remains technically relevant and is a valid code-oriented guide.
- The guide still includes optional PostgreSQL and Redis services even though the sample app does not use them. This is technically valid, but a future revision could make those services opt-in with Compose profiles to keep the default development stack smaller.
