# Validation Summary: How to Use Buildah Commands with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildah
- Podman
- OCI container images
- Containerfile concepts
- Linux package installation with dnf and apt
- Python, Flask, and Gunicorn container example

## Sources Consulted
- Buildah official repository and command documentation: https://github.com/containers/buildah
- Buildah `config` command documentation: https://github.com/containers/buildah/blob/main/docs/buildah-config.1.md
- Buildah `copy` command documentation: https://github.com/containers/buildah/blob/main/docs/buildah-copy.1.md
- Buildah `containers` command documentation: https://github.com/containers/buildah/blob/main/docs/buildah-containers.1.md
- Buildah `info` command documentation: https://github.com/containers/buildah/blob/main/docs/buildah-info.1.md
- Podman `info` command documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman `images` command documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `inspect` command documentation: https://docs.podman.io/en/stable/markdown/podman-inspect.1.html
- Oracle Linux Podman/Buildah documentation on shared image storage: https://docs.oracle.com/en/operating-systems/oracle-linux/podman/buildah.html

## Issues Found
- The first Buildah image example configured `python3` as the entrypoint but did not install Python in the Ubuntu-based image. I added `python3` to the `apt-get install` command so `podman run --rm my-custom-app:v1.0` can resolve the configured entrypoint.
- The example configured `buildah config --user appuser my-builder`, but the Ubuntu-based image did not contain an `appuser` entry. Buildah documentation notes that named users should exist in `/etc/passwd` and `/etc/group`, so I added a `useradd` command before setting the image user.
- The copied `main.py` contained plain text (`app code`), which would be invalid Python when the image runs. I changed it to a valid Python statement.

## Review Notes
Buildah and Podman were not installed in the local review environment, so command execution could not be tested locally. CLI syntax and behavior were checked against official Buildah and Podman documentation instead.
