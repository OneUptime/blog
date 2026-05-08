# Validation Summary: How to Debug Permission Denied Errors in Podman Containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- SELinux
- Linux file permissions
- Linux capabilities
- Podman Compose / Compose YAML
- strace

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman inspect documentation: https://docs.podman.io/en/v5.0.0/markdown/podman-inspect.1.html
- Podman unshare documentation: https://docs.podman.io/en/v4.4/markdown/podman-unshare.1.html
- Podman rootless mode documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman user namespace option documentation: https://docs.podman.io/en/v4.4/markdown/options/userns.container.html
- Compose Specification: https://compose-spec.github.io/compose-spec/spec.html

## Issues Found
- The SELinux section said volume mounts are blocked by default. Podman documentation states that unlabeled or incorrectly labeled content might be blocked by SELinux and that Podman does not relabel host content by default. Changed the wording to say mounts can be blocked unless the content has an allowed SELinux label.
- The SELinux audit command used `ausearch` without privilege escalation. Reading audit logs commonly requires elevated privileges, so the example now uses `sudo ausearch`.
- The `podman unshare id` comment said it shows what host UID maps to container root. Official `podman unshare` documentation shows that the invoking user appears as UID 0 inside the modified user namespace; the UID map itself is shown by `/proc/self/uid_map`. Updated the comment.
- The image user inspection example used generic `podman inspect`. Changed it to `podman image inspect` to match the documented object type for image configuration.
- The read-only root filesystem inspection example used generic `podman inspect`. Changed it to `podman container inspect`, which documents `.HostConfig.ReadonlyRootfs`.
- The capabilities section said required capabilities are dropped by default, but Podman containers retain a default capability set that includes several listed examples. Updated the wording to explain that failures happen with restricted or dropped capabilities, and changed the comment to "capabilities involved in permission errors."

## Review Notes
Podman was not installed in the local review environment, so CLI validation was performed against current official Podman documentation rather than local `--help` output.
