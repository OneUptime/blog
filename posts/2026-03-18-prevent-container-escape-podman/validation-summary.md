# Validation Summary: How to Prevent Container Escape with Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Linux containers
- Linux capabilities
- Linux namespaces
- seccomp
- SELinux volume relabeling
- Rootless containers

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman container inspect documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman user namespace option documentation: https://docs.podman.io/en/v4.3/markdown/options/userns.container.html
- Red Hat user namespaces with rootless containers: https://access.redhat.com/articles/5946151
- containers/common seccomp profile repository: https://github.com/containers/common

## Issues Found
- The opening quote claimed every container escape relies on excessive privilege. This was too absolute because kernel vulnerabilities and runtime bugs can still matter. Changed it to say many escapes rely on excessive privilege.
- The nginx capability example dropped all capabilities but did not add `NET_BIND_SERVICE`, even though nginx commonly binds to port 80. Added `--cap-add=NET_BIND_SERVICE`.
- The bind-mount example used `/tmp/app-data` without ensuring the source directory exists. Added `mkdir -p /tmp/app-data`.
- The seccomp example implied a short custom denylist was a complete anti-escape profile. Because Podman replaces the runtime default profile when `--security-opt seccomp=...` is used, added a warning to start from Podman's default profile for production and treated the snippet as a demo.
- The full anti-escape command referenced the demo seccomp profile as if it were production hardening. Removed that custom profile from the combined command so Podman's default seccomp profile remains active.
- The summary said the configuration makes escape practically impossible. Changed it to the more accurate "much harder."

## Review Notes
The post is technically relevant and the Podman CLI flags, inspect templates, user namespace mode, read-only root filesystem, tmpfs mounts, `no-new-privileges`, resource limits, and namespace checks are supported by current Podman documentation. The seccomp demo is syntactically valid, but a real production profile should be generated from or based on Podman's default seccomp policy and tested against the workload.
