# Validation Summary: How to Use the :Z and :z SELinux Volume Options in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- SELinux
- Linux bind mounts and volumes
- Container filesystem labeling

## Sources Consulted
- Podman `podman-run` documentation, "Labeling Volume Mounts": https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Red Hat Developer, "My advice on SELinux container labeling": https://developers.redhat.com/articles/2025/04/11/my-advice-selinux-container-labeling
- container-selinux manual page, MCS constrained container labels: https://manpages.opensuse.org/Tumbleweed/container-selinux/container_selinux.8.en.html

## Issues Found
- Clarified that SELinux blocks access when running in enforcing mode. SELinux-enabled systems in permissive mode may log denials without enforcing them.
- Narrowed the statement that host files are inaccessible by default. Many common host directory labels, such as user home labels, are not readable by confined containers, but some host content may already have container-compatible labels.
- Clarified the `:Z` private-label behavior for pods. Podman documents that all containers in the same pod share an SELinux label, so containers in the same pod can access a volume labeled with `:Z`.

## Review Notes
The command examples and volume option syntax are consistent with current Podman documentation. The `:U` option is valid with `:Z` and recursively changes ownership, so it should be used carefully on host directories.
