# Validation Summary: How to Run Podman, Buildah, and Skopeo Inside a Container on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Buildah
- Skopeo
- UBI 9 container images
- fuse-overlayfs
- SELinux container labeling
- Podman remote API socket
- containers/storage configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Running Skopeo, Buildah, and Podman in a container: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_running-skopeo-buildah-and-podman-in-a-container
- Podman documentation: podman-system-service(1): https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman documentation: podman-remote(1): https://docs.podman.io/en/stable/markdown/podman-remote.1.html
- Buildah documentation: buildah-run(1): https://www.mankier.com/1/buildah-run
- Buildah documentation: buildah-build(1): https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- containers/storage documentation: containers-storage.conf(5): https://www.mankier.com/5/containers-storage.conf
- Skopeo documentation: skopeo-copy(1): https://www.mankier.com/1/skopeo-copy
- containers/image transport documentation: containers-transports(5): https://www.mankier.com/5/containers-transports

## Issues Found
- The nested Podman examples used the generic UBI image and installed Podman manually. Red Hat documents prebuilt Podman images for this workflow, so the examples now use `registry.access.redhat.com/ubi9/podman`.
- The less-privileged Podman example recommended `--cap-add=SYS_ADMIN` and `seccomp=unconfined` as the restrictive path. Red Hat documents the less-privileged pattern with `--user podman`, `--security-opt label=disable`, and `--device /dev/fuse`, so the command and explanation were updated.
- The Podman remote socket example relabeled the host socket with `:Z` but did not disable SELinux labeling. Podman documentation recommends mounting the socket and running the container with `--security-opt label=disable`, so the mount and flags were corrected.
- The Buildah example used a generic UBI image, installed Buildah manually, and ran `buildah run` without the documented chroot isolation. It now uses a Buildah tool image and `buildah run --isolation=chroot`.
- The Skopeo example described `dir:/tmp/nginx` as copying between registries. That destination is a local directory transport, so the comment was corrected.
- The CI image and storage examples mounted rootful storage while later guidance recommended rootless execution. They now use the Podman tool image, run as the `podman` user, and persist rootless storage under `/home/podman/.local/share/containers`.
- The rootless nested container example referenced `quay.io/podman/stable`, which is not the RHEL-specific image used by the rest of the post. It now uses `registry.access.redhat.com/ubi9/podman`.

## Review Notes
The updated examples follow Red Hat's documented RHEL 9 container-tool-in-container patterns. Commands were not executed locally because Podman, Buildah, and Skopeo are not installed in the review environment.
