# Validation Summary: Running Docker on Apple Silicon: ARM64 Images, Rosetta, and Performance Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Desktop for Mac
- Apple Silicon / ARM64
- Rosetta 2 emulation for x86_64/amd64 containers
- Docker Buildx and multi-platform images
- Docker Compose bind mounts and named volumes
- Colima
- GitHub Actions Docker build workflow

## Sources Consulted
- Docker Desktop settings documentation: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker multi-platform builds documentation: https://docs.docker.com/build/building/multi-platform/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker image pull CLI reference: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker container run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker manifest inspect CLI reference: https://docs.docker.com/reference/cli/docker/manifest/inspect/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker GitHub Actions multi-platform image documentation: https://docs.docker.com/build/ci/github-actions/multi-platform/
- Colima configuration documentation: https://colima.run/docs/configuration/
- Colima commands documentation: https://colima.run/docs/commands/
- Local Docker CLI help output for `docker pull`, `docker run`, `docker buildx build`, `docker buildx create`, and `docker search`.

## Issues Found
- The introduction listed only M1/M2/M3 Macs while the post description covers M1/M2/M3/M4. Updated the introduction to include M4.
- Docker Desktop setting labels for virtualization and file sharing were outdated. Updated them to current wording: choose Apple Virtualization framework as the Virtual Machine Manager and choose VirtioFS for file sharing.
- Resource Saver was described as reducing VM resources while idle. Docker documents it as turning off the Linux VM when idle and restarting it when needed, so the description was corrected.
- The Docker Engine JSON example used `"default-platform": "linux/amd64"`, which is not a documented Docker daemon setting. Replaced it with the supported `DOCKER_DEFAULT_PLATFORM=linux/amd64` Docker CLI environment variable.
- The Compose example used the obsolete top-level `version: '3.8'` field. Removed it so the example follows the current Compose Specification.
- The Colima start command used `--cpu`; current Colima docs use `--cpus`. Updated the command.
- The Colima YAML example used nested `vm.type`, `vm.rosetta`, and `mount.type` keys. Current Colima configuration uses top-level `vmType`, `rosetta`, and `mountType`, so the snippet was corrected.
- The benchmark examples used `severalnines/sysbench`, which resolved as a single-platform manifest during validation and is unreliable for the ARM64/AMD64 comparison shown. Replaced the examples with multi-arch `alpine` commands that install and run `sysbench`.
- The production ARM64 example hardcoded `FROM --platform=linux/arm64` in a Dockerfile. Replaced it with a CI/build command using `docker buildx build --platform linux/arm64`, which avoids hardcoding a constant platform in the Dockerfile.
- The GitHub Actions example used `docker/build-push-action@v5`; Docker's current multi-platform GitHub Actions documentation uses `docker/build-push-action@v7`. Updated the action version.

## Review Notes
The `:cached` bind mount examples are accepted by Docker Compose, but these consistency flags originated as Docker Desktop for Mac bind-mount tuning and are less central when using VirtioFS. Future revisions could mention that VirtioFS is generally the primary performance setting and that consistency flags may have limited impact with newer file-sharing implementations.
