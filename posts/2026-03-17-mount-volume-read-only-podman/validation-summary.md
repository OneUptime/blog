# Validation Summary: How to Mount a Volume as Read-Only in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Bind mounts
- Named volumes
- SELinux volume labels
- Read-only root filesystems
- tmpfs mounts

## Sources Consulted
- Podman run reference, current v5.6.1 documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman volume option reference: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Podman mount option reference: https://docs.podman.io/en/v4.4/markdown/options/mount.html
- Podman inspect reference: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The `--mount` examples used the bare `readonly` option. Podman's official `--mount` documentation describes `ro`/`readonly` as boolean options with `true` or `false` values and shows examples such as `ro=true`. Updated both `--mount` examples to use `readonly=true`, and updated the summary text to match.

## Review Notes
Podman was not installed in the local environment, so command behavior was validated against the current official documentation rather than local CLI execution. The `:ro` volume syntax, named volume usage, SELinux `:z` and `:Z` suffixes, `--read-only`, `--tmpfs`, and `podman inspect --format` usage are consistent with the official references consulted.
