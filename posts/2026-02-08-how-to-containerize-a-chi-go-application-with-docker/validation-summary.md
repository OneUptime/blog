# Validation Summary: How to Containerize a Chi (Go) Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Chi router
- Go net/http
- Docker
- Docker multi-stage builds
- Docker Compose
- PostgreSQL Docker image
- Alpine Linux
- Air hot reload

## Sources Consulted
- Go release history and support policy: https://go.dev/doc/devel/release
- Go 1.26 release notes: https://go.dev/doc/go1.26
- Go packages documentation for Chi middleware: https://pkg.go.dev/github.com/go-chi/chi/v5/middleware
- Chi official repository and examples: https://github.com/go-chi/chi
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI run reference for stop signal behavior: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Official Image for Go tags: https://hub.docker.com/_/golang
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres

## Issues Found
- The prerequisites listed Go 1.21+, and the Dockerfiles used `golang:1.22-alpine`. Go's official policy supports only the current and previous major releases; as of 2026-06-05, Go 1.26 is current and Go 1.25 is still supported. Updated the prerequisite to Go 1.25+ and the builder images to `golang:1.26-alpine`.
- The Alpine runtime example used `alpine:3.19`, whose main support ended on 2025-11-01. Updated it to `alpine:3.23`, which is currently supported.
- The Docker Compose examples used `version: "3.8"`. Docker's current Compose Specification keeps the top-level `version` property only for backward compatibility and warns that it is obsolete. Removed the `version` line from both Compose snippets.

## Review Notes
The main Chi application and graceful shutdown examples were compile-checked in a Go 1.26 container against the current Chi v5 module. The Chi router and middleware examples use current APIs, including `chi.NewRouter`, `r.Use`, `r.Route`, `chi.URLParam`, and the standard `func(http.Handler) http.Handler` middleware shape. Docker's default stop signal behavior supports the graceful shutdown explanation. The PostgreSQL Compose service uses documented official-image environment variables and a conventional `pg_isready` healthcheck.
