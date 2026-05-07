# Validation Summary: How to Debug Applications Inside Podman Containers

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Podman
- Container logs, exec, inspect, networking, events, and startup troubleshooting
- Python and debugpy
- Node.js inspector and VS Code attach debugging
- Java JDWP remote debugging and IntelliJ IDEA
- Go, Delve, and container ptrace/seccomp considerations
- Dockerfile / Containerfile examples

## Sources Consulted
- Podman logs documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman events documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman exec documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Podman inspect documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman port documentation: https://docs.podman.io/en/v4.3/markdown/podman-port.1.html
- Podman volume option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman security-opt documentation: https://docs.podman.io/en/v4.4/markdown/options/security-opt.html
- debugpy documentation: https://github.com/microsoft/debugpy
- Node.js debugging / inspector documentation: https://nodejs.org/en/docs/inspector/
- Node.js release schedule: https://github.com/nodejs/Release
- Node official Docker image tags: https://hub.docker.com/_/node
- IntelliJ IDEA remote debug documentation: https://www.jetbrains.com/help/idea/tutorial-remote-debug.html
- Go 1.26 release notes: https://go.dev/doc/go1.26
- Go release history: https://go.dev/doc/devel/release
- Go official Docker image tags: https://hub.docker.com/_/golang
- Delve project documentation: https://github.com/go-delve/delve
- VS Code Go debugging documentation: https://github.com/golang/vscode-go/wiki/debugging

## Issues Found
- The Node.js Dockerfile used `node:20-bookworm-slim`. Node.js 20 reached end of life on April 30, 2026 according to the Node.js release schedule, so the example now uses `node:24-bookworm-slim`, a current LTS official image tag.
- The Go Dockerfile used `golang:1.22` in both builder and runtime stages. Go 1.22 is no longer a current supported release, and Go 1.26 is the latest release as of this review. Both stages now use `golang:1.26-bookworm`, an official current tag.

## Review Notes
- Podman CLI examples for logs, exec, port inspection, inspect formatting, events, diff, stats, export, entrypoint override, volume relabeling with `:Z`, and `--security-opt=seccomp=unconfined` match the official Podman documentation.
- The debugpy, Node.js inspector, Java JDWP, and Delve command patterns are technically correct. Published debugger ports should be limited to trusted development environments because remote debuggers can execute code inside the application process.
