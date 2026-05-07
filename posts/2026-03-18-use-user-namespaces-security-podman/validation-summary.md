# Validation Summary: How to Use User Namespaces for Security in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Linux user namespaces
- Rootless containers
- Podman Compose / Compose files

## Sources Consulted
- Podman `podman-create` reference: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman rootless mode reference: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman `podman-system-migrate` reference: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman `podman compose` reference: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post said rootless Podman needed no special configuration. I corrected this to note that subordinate UID/GID ranges in `/etc/subuid` and `/etc/subgid` are required for normal rootless user-namespace operation.
- The `userns-test` example left a rootless container running before later `--userns=auto` examples. I added a `podman stop userns-test` step because current Podman docs note that running rootless containers without `--userns=auto` can consume the full subordinate range and prevent later subdivision.
- The `--userns=keep-id` example incorrectly described the mode as disabling remapping and used `ls` on `/proc/self/uid_map`. I fixed the description to reflect current `keep-id` behavior and changed the command to `cat /proc/self/uid_map`.
- The `keep-id` explanation only mentioned UID mapping. I corrected it to UID/GID mapping.
- The rootful `--userns=auto` example omitted the requirement for a `containers` subordinate ID range. I added that requirement and clarified that the `containers.conf` example sets a system-wide default unless overridden.
- The Compose example used the obsolete top-level `version` field. I removed it and added a note that `userns_mode` support depends on the compose provider used by `podman compose`, which the official docs describe as an external wrapper around another compose implementation.

## Review Notes
- The post is now technically consistent with the current official documentation reviewed on 2026-05-07.
- Examples assume a Linux environment with Podman installed and configured; `podman` was not available in the local review environment, so command behavior was verified against official documentation rather than local CLI execution.
