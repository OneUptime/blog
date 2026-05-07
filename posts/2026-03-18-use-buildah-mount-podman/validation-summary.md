# Validation Summary: How to Use Buildah Mount with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildah
- Podman
- Linux containers
- Container filesystem mounts
- Shell commands
- Ubuntu, Debian, Alpine, and RPM-based container images

## Sources Consulted
- Buildah upstream README and command list: https://github.com/containers/buildah
- Buildah `mount` upstream man page: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-mount.1.md
- Buildah `umount` upstream man page: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-umount.1.md
- Buildah `rm` upstream man page: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-rm.1.md
- Buildah `run` upstream man page: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-run.1.md
- Buildah `config` man page: https://manpages.debian.org/testing/buildah/buildah-config.1.en.html
- Podman `run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The bulk file operations example used `chmod -R 644 $mountpoint/app/conf/`. This removes the execute/search bit from the `conf` directory itself, making normal directory traversal fail. Changed it to apply `755` to directories and `644` to files with `find`.

## Review Notes
The Buildah mount, unmount, run, config, and remove commands match current documented syntax. The rootless note is consistent with the Buildah mount documentation: rootless mounts may need to be performed inside `buildah unshare`, especially when using storage drivers other than `vfs`.
