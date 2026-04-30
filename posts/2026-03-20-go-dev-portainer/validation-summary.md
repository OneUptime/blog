# Validation Summary: How to Set Up a Go Development Environment with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker / Docker Compose
- Go
- Air
- Delve
- PostgreSQL
- Redis
- VS Code Go extension
- golang-migrate

## Sources Consulted
- Go `database/sql` package docs: https://pkg.go.dev/database/sql
- Go `net/http` package docs: https://pkg.go.dev/net/http
- go-redis v9 package docs: https://pkg.go.dev/github.com/redis/go-redis/v9
- Air example config: https://github.com/air-verse/air/blob/master/air_example.toml
- Air config implementation: https://github.com/air-verse/air/blob/master/runner/config.go
- Delve usage docs: https://github.com/go-delve/delve/tree/master/Documentation/usage
- VS Code Go debugging docs: https://github.com/golang/vscode-go/blob/master/docs/debugging.md
- Docker Compose file reference for `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer relative path guidance: https://docs.portainer.io/advanced/relative-paths
- Portainer stack-from-Git build limitation: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git
- Portainer known issue for Compose `build` on remote environments: https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- golang-migrate CLI docs: https://github.com/golang-migrate/migrate/blob/master/cmd/migrate/README.md

## Issues Found
- The Portainer stack used relative `.` paths for both `build.context` and the `/app` bind mount. In Portainer, relative paths are only supported for specific Git-deployed stack workflows, so I changed the example to absolute host paths and added a note about Portainer's path and remote-build constraints.
- The Compose snippet included a top-level `version: "3.8"` field, which is obsolete in current Docker Compose. I removed it.
- The PostgreSQL service mounted `./migrations` even though migrations were executed from the app container's `/app/migrations` path. I removed the unnecessary relative bind mount.
- The Go sample ignored errors from `redis.ParseURL`, did not verify the Redis connection during startup, and ignored the error returned by `http.ListenAndServe`. I fixed all three so the sample behaves correctly at startup and on server failure.
- The health endpoint returned JSON without setting a JSON content type. I added the `Content-Type: application/json` header.
- The Delve instructions started `dlv debug` inside a container already running Air, which would create a second copy of the app and can conflict on the app port. I changed the workflow to attach Delve to the Air-managed process instead.
- The VS Code debugger config used the legacy remote adapter style with deprecated `remotePath`. I updated it to the current `dlv-dap` remote attach configuration using `substitutePath`.
- The Dockerfile now installs `procps` so the documented `pgrep` command used by the Delve attach workflow is available in the container.

## Review Notes
- `golang:1.22-alpine`, `postgres:15-alpine`, and `redis:7-alpine` are valid pinned examples, but they are version-specific and should be refreshed periodically as newer stable releases become the norm.
- Validation in this workspace was documentation-based. Local executable verification was not possible because `go` and `docker` were not installed in the environment.
