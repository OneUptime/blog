# Validation Summary: How to Use devpts Mounts with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman containers
- Linux devpts filesystem
- Pseudo-terminal devices (PTYs)
- OpenSSH server containers
- Terminal multiplexers such as tmux and screen

## Sources Consulted
- Podman run documentation: `--mount=type=TYPE` and `type=devpts` options - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman shared mount option documentation - https://docs.podman.io/en/v4.6.1/markdown/options/mount.html
- Linux `mount(8)` manual: devpts mount options - https://man7.org/linux/man-pages/man8/mount.8.html
- Linux kernel documentation: The Devpts Filesystem - https://docs.kernel.org/filesystems/devpts.html

## Issues Found
1. **Unsupported Podman `ptmxmode` option.** Linux devpts supports `ptmxmode`, but current Podman documentation for `--mount type=devpts` lists `uid`, `gid`, `mode`, and `max`; it does not document `ptmxmode` as a supported Podman mount key. Replaced the `ptmxmode` examples and summary text with Podman's supported `max` option.

2. **PTY verification command used Alpine without Python.** The `python3 -c 'import pty; ...'` command would fail on the base Alpine image because Python is not installed, and the previous fallback message could hide that failure. Changed the command to use `docker.io/library/python:3-alpine` and changed the fallback message to indicate failure.

## Review Notes
- Podman was not installed in the local review environment, so CLI behavior was checked against official Podman documentation rather than local `podman --help` output.
- The post's general explanation of devpts, `/dev/pts`, PTY allocation, and the `uid`, `gid`, and `mode` options aligns with the Linux `mount(8)` manual and Podman documentation.
