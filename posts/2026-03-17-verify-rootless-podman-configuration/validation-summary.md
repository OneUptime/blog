# Validation Summary: How to Verify Rootless Podman Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- subuid/subgid mappings
- Container storage
- Container networking and port publishing
- Bind mounts and named volumes
- Bash scripting
- curl

## Sources Consulted
- Podman rootless mode documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html#rootless-mode
- Podman unshare documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html
- Podman info documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman create/run volume option documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html#volume-v-source-volume-host-dir-container-dir-options
- Podman volume create documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman volume rm documentation: https://docs.podman.io/en/v4.3/markdown/podman-volume-rm.1.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The post stated that rootless containers will not work if `/etc/subuid` or `/etc/subgid` entries are empty. Podman documentation says standard rootless setups require subordinate UID/GID ranges, but also documents single-UID operation for constrained environments with `ignore_chown_errors`. Changed the wording to say a standard rootless setup is incomplete.
- The storage path expectation only listed `/home/<user>/.local/share/containers/storage`. Podman documentation notes that `XDG_DATA_HOME` and rootless `storage.conf` can change this path. Added that caveat.
- The port publishing test used a single immediate `curl` after starting nginx, which can fail before nginx is ready. Added `curl --retry`, `--retry-delay`, and `--retry-connrefused`.
- The validation script checked subordinate ID files with an unanchored username match. Changed it to match `^${USER}:` so it validates the current user's entry instead of a substring.
- The validation script's port publishing check could leave the `ptest` container behind if `curl` failed. Updated the command to remove any stale test container first and clean up after the test regardless of success or failure.

## Review Notes
The networking checks use ICMP `ping`, which is useful as a smoke test but may fail in environments where ICMP is blocked even when TCP/HTTP networking works. This is acceptable for a verification guide, but future revisions could add a TCP-based connectivity check for environments that restrict ping.
