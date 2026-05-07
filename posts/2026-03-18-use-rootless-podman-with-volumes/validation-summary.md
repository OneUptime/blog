# Validation Summary: How to Use Rootless Podman with Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers and user namespaces
- Container volumes and bind mounts
- SELinux volume relabeling
- tmpfs mounts
- PostgreSQL container image

## Sources Consulted
- Podman `podman run` reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--volume` option reference: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman `podman unshare` reference: https://docs.podman.io/en/v4.4/markdown/podman-unshare.1.html
- Podman `podman volume inspect` reference: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman `podman system df` reference: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman volume export` reference: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman `podman volume import` reference: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- PostgreSQL Docker Official Image docs: https://hub.docker.com/_/postgres/

## Issues Found
- The `postgres:16` example omitted `POSTGRES_PASSWORD`, which the official PostgreSQL image requires for normal initialization. I added `-e POSTGRES_PASSWORD=example` so the example starts correctly.
- The bind-mount example used the container default user and only listed the directory, which would not reliably demonstrate the permission problem discussed. I changed it to run as `--user 1000:1000` and attempt a write so the example matches the rootless non-root UID mapping issue described in the text.
- The `podman unshare chown` verification flow did not demonstrate successful non-root access after the ownership fix. I updated it to verify numeric host ownership and then verify a write from the container as UID `1000:1000`.
- The `:U` section described the flag as “automatic UID mapping,” but Podman documents `:U` as a recursive ownership change on the host filesystem, not a namespace mapping change. I corrected the heading and explanation.
- The tmpfs section claimed tmpfs mounts “avoid all permission issues,” which is too broad. I narrowed this to host bind-mount ownership issues.

## Review Notes
- Podman was not installed in the local review environment, so command validation was performed against current official Podman documentation and the official PostgreSQL container image documentation.
- Podman documents that `:U`, `:z`, and `:Z` may recursively modify files under the mounted path and can add startup latency on large directory trees.
