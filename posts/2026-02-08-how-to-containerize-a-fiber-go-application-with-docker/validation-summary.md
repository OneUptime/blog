# Validation Summary: How to Containerize a Fiber (Go) Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Fiber
- Docker
- Docker Compose
- Alpine Linux
- PostgreSQL
- GORM
- Air

## Sources Consulted
- Fiber v2 package documentation: https://pkg.go.dev/github.com/gofiber/fiber/v2
- Fiber v2 application API documentation: https://docs.gofiber.io/v2.x/api/app/
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Docker Go image guide: https://docs.docker.com/guides/golang/build-images/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Hub Go official image page: https://hub.docker.com/_/golang
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- PostgreSQL versioning policy: https://www.postgresql.org/support/versioning/
- GORM database connection documentation: https://gorm.io/docs/connecting_to_the_database.html
- Air README: https://github.com/air-verse/air
- Go modules reference: https://go.dev/ref/mod/

## Issues Found
- The post stated that Go compiles to a single static binary. This was too broad because Go can produce static binaries, but cgo and some dependencies can introduce external runtime dependencies. Changed the wording to say Go can compile to a single static binary.
- The prerequisites listed Go 1.21+, while the current Air installation guidance requires Go 1.25 or higher. Updated the prerequisite to Go 1.25+.
- The Dockerfiles used `golang:1.22-alpine`, which is outdated for a 2026 tutorial. Updated the build images to `golang:1.26-alpine`, matching current official Go image tags.
- The Alpine runtime example used `alpine:3.19`, whose standard support ended on November 1, 2025. Updated it to `alpine:3.23`, a currently supported Alpine release.
- Both Docker Compose examples included `version: "3.8"`. Docker Compose now treats the top-level `version` property as obsolete and informational, so it was removed from both snippets.

## Review Notes
Fiber v2 remains valid and maintained, though Fiber v3 is the highest tagged major version. The tutorial consistently uses Fiber v2 imports, so no version migration was required. PostgreSQL 16 remains supported through November 9, 2028, so the `postgres:16-alpine` examples are still technically valid.
