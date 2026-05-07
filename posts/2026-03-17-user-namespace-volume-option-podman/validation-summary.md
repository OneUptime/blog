# Validation Summary: How to Use the :U Volume Option for User Namespace Mapping in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Rootless containers
- User namespaces
- Bind mounts and named volumes
- SELinux volume labels

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--userns` option documentation: https://docs.podman.io/en/v4.3/markdown/options/userns.container.html
- Podman `--uidmap` option documentation: https://docs.podman.io/en/v4.6.1/markdown/options/uidmap.container.html
- Podman `podman-unshare` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html

## Issues Found
- The post implied that a default rootless bind mount without `:U` may appear as `nobody` or a high UID. In default rootless Podman, container root maps to the invoking host user, so host-user-owned files commonly appear as root inside the container. I updated the example to run as a non-root container user and explain the actual write-access mismatch.
- The post implied that using `:U` generally changes host ownership to a high UID corresponding to container root. In default rootless Podman, container root maps to the invoking host UID. I clarified that high host UIDs appear for non-root container users or alternate user namespace modes, and updated the example to show container UID 1000 mapping to host UID 100999 with a `user:100000:65536` subordinate UID range.

## Review Notes
The `:U`, `:Z`, and `:z` volume option syntax is valid, and Podman documents that `:U` recursively changes source volume ownership and should be used with caution because it modifies the host filesystem. Named volumes are also valid with `-v name:/path:U`, though Podman may already perform automatic ownership adjustment for newly initialized named volumes under documented conditions.
