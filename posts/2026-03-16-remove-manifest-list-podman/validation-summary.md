# Validation Summary: How to Remove a Manifest List with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Docker manifest lists
- OCI image indexes
- Multi-architecture image builds
- Shell scripting

## Sources Consulted
- Podman `podman manifest rm` documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-rm.1.html
- Podman `podman manifest exists` documentation: https://docs.podman.io/en/v5.0.3/markdown/podman-manifest-exists.1.html
- Podman `podman manifest inspect` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- Podman `podman manifest create` documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman `podman manifest add` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `podman manifest push` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman system prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html

## Issues Found
- The "Understanding Manifest Lists" example claimed to list all manifest lists but only inspected one image reference. Changed it to use `podman manifest exists` for existence checks and `podman images --filter manifest=true` for listing local manifest lists.
- The CI cleanup example suppressed errors manually even though `podman manifest rm` supports `--ignore`. Changed the cleanup command to use `podman manifest rm --ignore`.
- The multi-architecture push example did not explicitly pass `--all`. Current Podman documentation lists `--all` for pushing referenced images with the manifest list, so the example now uses `podman manifest push --all`.
- The "Removing All Local Manifest Lists" script used `--filter dangling=true`, which filters dangling images rather than manifest lists. Changed it to `--filter manifest=true`.
- The cleanup note said `podman system prune --all --force` removes all images including manifest lists. Podman documents this as removing unused images, so the text now says it removes all unused images, which can include manifest lists.

## Review Notes
The examples are generally current for modern Podman. The build-script example may still require host support for non-native architecture builds, such as emulation/binfmt setup, depending on the environment.
