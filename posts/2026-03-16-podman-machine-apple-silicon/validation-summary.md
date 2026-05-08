# Validation Summary: How to Use Podman Machine on Apple Silicon Macs

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Podman
- Podman Machine
- Apple Silicon
- Apple Virtualization Framework / AppleHV
- Rosetta
- Multi-architecture container images
- PostgreSQL, Redis, Node.js containers

## Sources Consulted
- Podman `podman machine init` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman `podman machine inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman `podman machine list` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Podman `podman machine set` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman `podman image inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `podman build` documentation: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- containers.conf machine table documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- Docker Postgres Official Image documentation: https://hub.docker.com/_/postgres

## Issues Found
- `podman machine init --rosetta` is not a current documented CLI option. Updated Rosetta guidance to use Podman's default AppleHV ARM64 Rosetta behavior, with `CONTAINERS_MACHINE_ROSETTA=true` shown only for users who previously disabled Rosetta.
- `podman machine inspect | jq '.VMType'` does not match the current inspect JSON fields. Updated VM type verification to use `podman machine list --format "{{.Name}} {{.VMType}}"`, and changed the inspect example to show `ConfigDir.Path` and `.Rosetta`.
- `podman inspect web --format '{{.Architecture}}'` inspects the container, where `Architecture` is not a documented container inspect placeholder. Updated it to `podman image inspect nginx --format '{{.Architecture}}'`.
- The multi-architecture build example used `-t` with multiple `--platform` values. Podman documentation says multi-platform builds should use `--manifest`; updated the command accordingly.
- The development workflow set `DATABASE_URL` to `mydb` but did not create that database in the Postgres container. Added `POSTGRES_DB=mydb`.
- Removed an unsupported claim that VirtioFS is the documented default for AppleHV file sharing and kept the performance advice focused on named volumes for high-I/O paths.

## Review Notes
The local environment did not have the `podman` binary installed, so CLI behavior was validated against official current documentation rather than local `--help` output.
