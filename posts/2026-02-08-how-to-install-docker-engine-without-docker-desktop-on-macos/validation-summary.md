# Validation Summary: How to Install Docker Engine Without Docker Desktop on macOS

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Desktop licensing
- Colima
- Lima
- OrbStack
- Docker Compose
- Docker Buildx
- macOS virtualization, Apple Silicon, Rosetta, QEMU, and VirtioFS

## Sources Consulted
- Docker Desktop license agreement: https://docs.docker.com/subscription/desktop-license/
- Docker Compose installation overview: https://docs.docker.com/compose/install/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Buildx create reference: https://docs.docker.com/reference/cli/docker/buildx/create/
- Docker Build drivers documentation: https://docs.docker.com/build/builders/drivers/
- Docker context create reference: https://docs.docker.com/reference/cli/docker/context/create/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Colima command reference: https://colima.run/docs/commands/
- Colima configuration reference: https://colima.run/docs/configuration/
- Lima Docker template documentation: https://lima-vm.io/docs/examples/containers/docker/
- Lima start command reference: https://lima-vm.io/docs/reference/limactl_start/
- OrbStack Docker documentation: https://docs.orbstack.dev/docker/
- OrbStack pricing page: https://orbstack.dev/pricing
- Homebrew docker-compose formula: https://formulae.brew.sh/formula/docker-compose
- Homebrew OrbStack cask: https://formulae.brew.sh/cask/orbstack

## Issues Found
- Colima resource flag examples used `--cpu`; current Colima documentation uses `--cpus`. Updated all affected commands.
- Colima default disk size was listed as 60 GB; current Colima documentation lists 100 GiB. Updated the default settings comment.
- The Colima delete example said it deleted the VM entirely, but `colima delete` preserves container data by default. Updated the example to `colima delete --data`.
- The Colima additional mount example used a guest target path syntax not shown in current Colima documentation. Updated it to the documented `--mount /Volumes/data:w` form.
- The Docker bind mount example did not quote `$(pwd)`, which can break project paths containing spaces. Updated it to `-v "$(pwd)":/app`.
- Lima's Docker template example used the old `template://docker` URL syntax and a hardcoded socket path. Updated it to current `template:docker` syntax and the documented `limactl list docker --format` socket lookup.
- OrbStack's Homebrew install command omitted `--cask`. Updated it to `brew install --cask orbstack`.
- The Compose install description called Homebrew's `docker-compose` a standalone Compose binary. Updated it to describe Compose v2 as a Docker CLI plugin with a compatibility command.
- The multi-architecture Buildx example created a builder without explicitly using the `docker-container` driver and built without exporting the result. Updated it to create a `docker-container` builder and push the multi-platform image to a registry.

## Review Notes
The post is technically relevant and generally current after the fixes. Docker Desktop, OrbStack, Homebrew, Colima, and Lima licensing or install details can change over time, so those sections should be rechecked during future review cycles.
