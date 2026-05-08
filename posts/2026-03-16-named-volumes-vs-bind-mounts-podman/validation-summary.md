# Validation Summary: How to Use Named Volumes vs Bind Mounts in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman named volumes
- Podman bind mounts
- SELinux volume relabeling options
- PostgreSQL container storage
- Node.js development containers
- Go build containers

## Sources Consulted
- Podman `--volume` option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman `--mount` option documentation: https://docs.podman.io/en/v4.4/markdown/options/mount.html
- Podman `podman volume create` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman `podman volume export` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman `podman volume import` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres/
- Go Docker Official Image documentation: https://hub.docker.com/_/golang/

## Issues Found
- The Node.js live-reload example mounted only `$(pwd)/src` into `/app/src`, then ran `npm run dev` from `/app`. With the stock `node:20-alpine` image, `/app` would not contain the project's `package.json` unless the full app was mounted or baked into the image. Changed the bind mount to `$(pwd):/app:Z` so the command matches the described development workflow.
- The Go build-cache example ran `go build ./...` in the stock `golang:1.21` image without mounting a project directory or setting the working directory. Changed the example to mount the current project at `/src`, set `-w /src`, and mount the named volume at `/root/.cache/go-build`, which is the Go build cache location.

## Review Notes
- Podman was not installed in the local environment, so command validation was performed against official Podman documentation rather than local `--help` output.
- The post correctly describes named volume auto-creation, bind mount source path requirements, `:Z`/`:z` SELinux relabeling options, named-volume copy behavior on first use, and bind mounts hiding image content at the mount target.
- The performance section is broadly directional, but performance can vary by filesystem, OS, remote Podman setup, SELinux relabeling, and workload. Future revisions could add that caveat.
