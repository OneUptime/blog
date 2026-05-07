# Validation Summary: How to Use OCI Artifacts for Binary Distribution with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- OCI artifacts
- OCI registries
- Go
- Bash
- SHA-256 checksums

## Sources Consulted
- Podman artifact command overview: https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- Podman artifact add: https://docs.podman.io/en/latest/markdown/podman-artifact-add.1.html
- Podman artifact ls: https://docs.podman.io/en/latest/markdown/podman-artifact-ls.1.html
- Podman artifact inspect: https://docs.podman.io/en/latest/markdown/podman-artifact-inspect.1.html
- Podman artifact pull: https://docs.podman.io/en/stable/markdown/podman-artifact-pull.1.html
- Podman artifact push: https://docs.podman.io/en/latest/markdown/podman-artifact-push.1.html
- Podman artifact extract: https://docs.podman.io/en/latest/markdown/podman-artifact-extract.1.html
- Podman artifact overview in v5.4.0: https://docs.podman.io/en/v5.4.0/markdown/podman-artifact.1.html
- Podman artifact overview in v5.5.0: https://docs.podman.io/en/v5.5.0/markdown/podman-artifact.1.html
- Go command reference (`go build`): https://pkg.go.dev/cmd/go
- Go modules reference: https://go.dev/ref/mod

## Issues Found
- The tutorial originally created only a standalone `hello.go`, but the later CI/CD script used `go build .`. In current Go module-aware workflows, package builds like `go build .` require module context. I added `go mod init example.com/myapp` so the later package-based build commands are valid in the demonstrated workflow.
- The download section treated `podman artifact pull` as though it made the binary immediately available on disk. Podman documents `pull` as storing the artifact locally and `artifact extract` as the step that writes blobs to a local file or directory. I changed the script to pull, extract, and then mark the extracted binary executable.
- The original consumer script inspected the artifact with `jq` using `.layers[]`, but Podman’s documented inspect output nests layers under `.Manifest.layers`. I removed that broken lookup entirely and used `podman artifact extract` directly, which is the correct supported workflow for a single-file artifact.
- The post reused artifact names across sections. I added `--replace` to the `podman artifact add` examples so the guide remains runnable top-to-bottom and on repeat runs without leaving conflicting local artifact names behind.

## Review Notes
- `podman artifact extract` is documented in Podman 5.5.0 and later, but it is absent from the v5.4.0 artifact command overview. Readers need a recent Podman release for the corrected download workflow.
