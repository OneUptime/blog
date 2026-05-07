# Validation Summary: How to Build and Push Images in CI with Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Containerfile/Dockerfile image builds
- Container registries
- Docker Hub
- GitHub Container Registry
- Quay.io
- Multi-architecture container images
- OCI image labels
- Bash CI scripting

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman login` documentation: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- Podman `podman manifest create` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-create.1.html
- Podman `podman manifest add` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `podman manifest push` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman `podman manifest inspect` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Docker Hub access token documentation: https://www.docker.com/blog/docker-hub-new-personal-access-tokens/
- Quay.io robot account documentation: https://docs.quay.io/glossary/robot-accounts.html
- OCI Image Format Specification annotations: https://specs.opencontainers.org/image-spec/annotations/

## Issues Found
- The multi-architecture example built separate local architecture-specific images with `--tag` and then added them to a manifest using unqualified image references. Podman's manifest-add documentation treats unqualified image operands as the default `docker://` registry transport, while local container storage requires the `containers-storage:` transport. I replaced that sequence with Podman's documented `podman build --platform ... --manifest ...` flow, which builds the platform variants directly into one manifest list before pushing it.

## Review Notes
- The local environment did not have Podman installed, so command verification was performed against official Podman documentation rather than local `podman --help` output.
- Cross-architecture builds that execute `RUN` instructions may require emulation such as `qemu-user-static` in CI. The updated example uses the documented Podman manifest workflow, but CI runners still need suitable platform support for the Containerfile being built.
