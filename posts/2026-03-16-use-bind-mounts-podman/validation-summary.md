# Validation Summary: How to Use Bind Mounts with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Bind mounts
- SELinux volume labels
- Rootless containers
- Mount propagation

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--volume` option official documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html

## Issues Found
- The post said a non-existent host path creates an empty directory. Current Podman documentation says Podman returns an error when a specified host source path does not exist, so the gotcha was corrected to tell readers to pre-create host files and directories.
- The configuration example used `:Z` on `/etc/redis/redis.conf`. Podman documentation warns against relabeling system files and directories because it can break confined services, so the example now mounts a project-local `redis.conf` file.
- The relative path gotcha implied relative host paths are not usable. Podman supports relative paths when they begin with `.`; sources that do not begin with `.` or `/` are treated as named volumes. The note was corrected to explain that distinction.
- Several examples used unquoted `$(pwd)` command substitutions. These were quoted so the shell examples continue to work when the project path contains spaces.

## Review Notes
The command syntax, `-v` and `--mount` bind mount forms, read-only/read-write options, SELinux `:z` and `:Z` behavior, multiple `-v` mounts, bind mount hiding of image content, propagation options, and `--userns=keep-id` guidance were consistent with the official Podman documentation. The local environment did not have `podman` installed, so CLI behavior was verified against official documentation rather than local `--help` output.
