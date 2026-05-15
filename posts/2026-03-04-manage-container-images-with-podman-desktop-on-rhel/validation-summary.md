# Validation Summary: How to Manage Container Images with Podman Desktop on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Podman Desktop
- Podman CLI
- Container images
- Containerfile/Dockerfile syntax
- containers-registries.conf

## Sources Consulted
- Podman Desktop documentation: Pulling an image: https://podman-desktop.io/docs/containers/images/pulling-an-image
- Podman Desktop documentation: Building an image: https://podman-desktop.io/docs/containers/images/building-an-image
- Podman Desktop documentation: Registries: https://podman-desktop.io/docs/containers/registries
- Podman Desktop tutorial: Managing your application resources: https://podman-desktop.io/tutorial/managing-your-application-resources
- Podman documentation: podman build: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman documentation: podman pull: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman documentation: podman images: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman documentation: podman image prune: https://docs.podman.io/en/latest/markdown/podman-image-prune.1.html
- Podman documentation: podman save: https://docs.podman.io/en/stable/markdown/podman-save.1.html
- containers-registries.conf manual: https://www.mankier.com/5/containers-registries.conf
- Red Hat Enterprise Linux documentation: Installing Podman Desktop on RHEL 10: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/building_running_and_managing_containers/installing-podman-desktop-on-rhel10

## Issues Found
- The `registries.conf` example placed `unqualified-search-registries` after a `[[registry]]` table. In TOML, that would make it part of the registry table instead of the global configuration. Moved `unqualified-search-registries` before `[[registry]]` so it is a global setting, matching the `containers-registries.conf` manual.
- The cleanup comment said `podman image prune -a` removes images that no running containers reference. The official Podman documentation defines `--all` as removing images with no associated containers, including stopped containers. Updated the wording to "no containers reference them."

## Review Notes
Podman is not installed in the local review environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output. The Podman Desktop UI labels in the post are broadly consistent with current documentation, though some official pages use shorter button labels such as "Pull" and "Build" before the dialog-specific labels.
