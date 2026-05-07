# Validation Summary: How to Configure Default Volumes in containers.conf

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- containers.conf
- Container bind mounts and volumes
- SELinux volume labels
- Rootless container permissions

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- Containers `containers.conf(5)` documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- Arch Linux `containers.conf(5)` manual page: https://man.archlinux.org/man/containers.conf.5.en

## Issues Found
- The initial default volume example mounted `/etc/timezone`, which is not present on all Linux distributions. Podman requires bind mount source paths to exist, so this could make every container run fail on hosts without that file. Removed that mount from the default example.
- The `:U` option was described as "Chown to container user (rootless)". Podman documents this as recursively changing ownership of the source volume based on the UID and GID used in the container. Updated the wording to avoid implying it is only a rootless-specific behavior.
- The runtime volume example used `/tmp/test-data` without creating it first. Podman requires host bind mount sources to exist. Added `mkdir -p /tmp/test-data`.
- The runtime mount verification used `ls /data 2>/dev/null || echo "/data mount present"`, which only printed the success message on failure. Replaced it with `test -d /data && echo "/data mount present"`.
- The command intended to list both default and runtime mounts started a new container without the runtime `-v /tmp/test-data:/data` mount. Added the runtime mount flag to that command.
- The troubleshooting example used `/tmp/test` as a bind source without creating it first. Added `mkdir -p /tmp/test`.

## Review Notes
Podman was not installed in the local workspace, so the commands could not be executed here. The review was completed against official Podman and containers/common documentation. The post's recommendation to keep global default mounts minimal is technically sound, especially because default volumes apply broadly to container runs using that configuration.
