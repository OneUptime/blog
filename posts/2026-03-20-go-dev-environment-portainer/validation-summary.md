# Validation Summary: How to Set Up a Go Development Environment with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Go
- Air
- Delve
- Visual Studio Code Go extension

## Sources Consulted
- Docker Compose reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path volume behavior: https://docs.portainer.io/advanced/relative-paths
- Go release history and support policy: https://go.dev/doc/devel/release
- Go modules reference (`go install` behavior): https://go.dev/ref/mod
- Go source installation docs (`GOOS`/`GOARCH` target environment notes): https://go.dev/doc/install/source/
- Air official README and config examples: https://github.com/air-verse/air
- VS Code Go extension debugging docs: https://github.com/golang/vscode-go/wiki/debugging

## Issues Found
- The Compose example mounted `./src` to `/app`, but the article placed `.air.toml` in the project root and the code in `src/main.go`. That layout meant the config file would not be present inside the container and did not match the watch/build paths. I changed the bind mount to `/path/to/your/project:/app` so the mounted filesystem matches the documented project layout, and so the example is suitable for Portainer-hosted stack deployment.
- The Air build command compiled `.` even though the example application lives in `./src`. I changed the command to `go build -gcflags='all=-N -l' -o ./tmp/main ./src` so it builds the correct package.
- The Air config used `bin`, which the current Air docs mark as deprecated in favor of `entrypoint`. I replaced `bin = "tmp/main"` with `entrypoint = ["./tmp/main"]`.
- The Delve example targeted `.` instead of the `./src` package shown in the post. I changed the command to `dlv debug ./src --headless --listen=:2345 --api-version=2 --accept-multiclient`.
- The VS Code remote-debug example used `remotePath` and omitted an explicit `debugAdapter`. Current official guidance for remote Delve sessions uses `debugAdapter: "dlv-dap"` together with `substitutePath`. I updated the snippet accordingly.
- The Compose example used the obsolete top-level `version` field, pinned an outdated Go image (`golang:1.22-alpine`), and forced `GOOS`/`GOARCH` values that are unnecessary for normal containerized development and can break non-amd64 hosts. I removed the obsolete `version` line, updated the image to `golang:1.26-alpine`, and removed the target-platform overrides.

## Review Notes
- `CGO_ENABLED=0` is still present. That is fine for pure-Go projects like the sample server, but projects that require cgo will need a different setup.
- The bind mount assumes the project directory exists on the same Docker host where Portainer deploys the stack.
