# Validation Summary: How to Fix Podman Volume Permission Issues with SELinux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- SELinux
- Linux bind mounts and named volumes
- Podman Compose / Compose volume syntax
- Rootless Podman user namespaces

## Sources Consulted
- Podman `podman run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman unshare` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html
- Podman `podman container inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `podman volume create` official documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Docker Compose services reference for SELinux volume options: https://docs.docker.com/reference/compose-file/services/
- Local GNU coreutils `chcon(1)` man page

## Issues Found
- The warning said only `:Z` changes host SELinux labels. Podman documents both `:z` and `:Z` as relabeling options, so the warning now applies to both.
- The private `:Z` explanation omitted the Podman pod exception. Podman documents that containers in the same pod share an SELinux label, so the text now notes that exception.
- The `label=disable` section described disabling SELinux enforcement. Podman describes this as disabling SELinux separation for the container, so the section title and explanation were corrected.
- The rootless ownership explanation said `podman unshare chown -R 0:0` makes files owned by the subordinate UID range on the host. Podman documents that the invoking user's UID appears as UID 0 in the rootless namespace, so the explanation now distinguishes container UID 0 from non-root UIDs mapped through subordinate ranges.
- The application configuration example used `:z` on `/etc/my-app`, which conflicted with the post's warning not to relabel system directories. The example now uses a dedicated host directory under `/opt/my-app/config` mounted read-only into `/etc/my-app` inside the container.

## Review Notes
Podman was not installed in the review environment, so CLI behavior was verified against the current official Podman documentation rather than local `podman --help` output. The post is otherwise technically sound for current SELinux-enabled Podman usage.
