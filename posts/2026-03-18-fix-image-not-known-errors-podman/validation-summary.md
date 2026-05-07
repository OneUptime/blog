# Validation Summary: How to Fix 'image not known' Errors in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- containers/image registry configuration
- containers/storage configuration
- Short-name image resolution
- Rootless and rootful container storage
- Skopeo
- Podman Compose and pod YAML image references

## Sources Consulted
- Podman `podman pull` documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman image inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `podman system reset` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman `podman system migrate` documentation: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman upstream troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md
- containers/image `containers-registries.conf(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- containers/storage `containers-storage.conf(5)` documentation: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md
- Skopeo command documentation: https://www.mankier.com/1/skopeo and https://www.mankier.com/1/skopeo-list-tags

## Issues Found
- The opening explanation said Podman had simply searched local storage and found nothing. I changed it to say the image reference could not be matched in the local image store at the point Podman tried to use it, which better matches Podman's documented troubleshooting case where a pull may happen first and then fail while locating the pulled image.
- The short-name alias section implied `/etc/containers/registries.conf.d/shortnames.conf` is the single system alias file. I changed this to check the drop-in directory and added the documented rootful generated alias path, `/var/cache/containers/short-name-aliases.conf`.
- The compose and pod YAML section said image references must match exactly what is in the local store. I softened this to the technically accurate issue: short names are subject to Podman's short-name resolution rules, so fully qualified names avoid ambiguity and non-interactive failures.

## Review Notes
The local review environment did not have `podman` or `skopeo` installed, so CLI behavior was verified against current upstream documentation and authoritative man pages instead of local `--help` output.
