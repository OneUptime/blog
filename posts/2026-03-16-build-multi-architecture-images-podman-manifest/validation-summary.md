# Validation Summary: How to Build Multi-Architecture Images with podman manifest

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Multi-architecture image manifests
- OCI image indexes and Docker manifest lists
- CI/CD shell workflows

## Sources Consulted
- Podman manifest command documentation: https://docs.podman.io/en/latest/markdown/podman-manifest.1.html
- Podman manifest create documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-create.1.html
- Podman manifest add documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman manifest inspect documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- Podman manifest remove documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-manifest-remove.1.html
- Podman manifest rm documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-rm.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html

## Issues Found
- The "Updating a Published Manifest" example claimed to pull an existing manifest but used `podman manifest create "${IMAGE}" 2>/dev/null || true`, which creates a new local manifest list and does not import the remote manifest's entries. Changed it to `podman manifest create --all "${IMAGE}" "docker://${IMAGE}"` so the local manifest is created from all entries in the published remote manifest before removing and replacing the ARM64 digest.

## Review Notes
- The commands and options used in the rest of the post match the official Podman documentation. Building non-native architectures on one host may require binfmt/QEMU or native architecture runners when the Containerfile executes `RUN` instructions; this is an operational prerequisite rather than an error in the manifest workflow.
