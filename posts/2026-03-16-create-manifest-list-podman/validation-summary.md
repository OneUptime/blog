# Validation Summary: How to Create a Manifest List with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Manifest lists and image indexes
- Multi-architecture container builds
- Container registries

## Sources Consulted
- Podman manifest create documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman manifest add documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman manifest inspect documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- Podman manifest rm documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-manifest-rm.1.html
- Podman manifest overview: https://docs.podman.io/en/v5.4.2/markdown/podman-manifest.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman push documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman issue documenting empty manifest inspect output: https://github.com/containers/podman/issues/21294

## Issues Found
- The empty manifest inspect example used `"manifests": []`, but Podman represents a newly created empty manifest list with `"manifests": null`. Updated the JSON example.
- The cross-architecture build example used a Containerfile with a `RUN` instruction but did not mention that non-native builds need emulation. Added a caveat about configuring emulation such as `qemu-user-static`.
- The registry-reference manifest creation example used bare registry image names as sources. Updated those source image references to explicit `docker://` transports, matching Podman's documented examples for registry images.

## Review Notes
Podman's current `podman manifest push --all` documentation states that `--all` defaults to true, while the manifest overview still recommends using it to ensure all manifest contents are pushed. Keeping `--all` in the examples is technically correct and clearer for readers.
