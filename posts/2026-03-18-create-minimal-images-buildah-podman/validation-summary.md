# Validation Summary: How to Create Minimal Images with Buildah and Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Buildah
- OCI container images
- Alpine Linux
- Debian and Ubuntu base images
- Google Distroless images
- Go
- Python
- pip and Python virtual environments

## Sources Consulted
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Buildah `copy` documentation: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-copy.1.md
- Buildah `commit` documentation: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-commit.1.md
- Buildah `config` documentation: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-config.1.md
- Google Distroless README: https://github.com/GoogleContainerTools/distroless
- Google Distroless Python requirements example: https://github.com/GoogleContainerTools/distroless/blob/main/examples/python3-requirements/Dockerfile
- Python packaging specification for externally managed environments: https://packaging.python.org/en/latest/specifications/externally-managed-environments.html
- Alpine Linux `py3-flask` package listing: https://pkgs.alpinelinux.org/package/v3.21/community/x86_64/py3-flask

## Issues Found
- The image-size comparison used multiple `podman images --filter reference=...` flags for different images. Podman combines multiple filters, so this could return no rows instead of comparing the pulled images. Changed it to one `reference=ubuntu|debian|alpine|distroless` regex filter.
- The layer-squashing example used global `pip install` on Alpine after installing `py3-pip`. Current distro-managed Python environments can reject global pip installs, and Alpine packages Flask as `py3-flask`. Changed the example to install `py3-flask` with `apk`.
- The layer-squashing example copied `/tmp/goapp/main.go`, which only existed if an earlier section had been run. Added a small placeholder file creation step and copied that file instead.
- The distroless Python example copied Python 3.12 `site-packages` from `python:3.12-slim` into `gcr.io/distroless/python3-debian12`. Distroless Python for Debian 12 follows Debian's Python runtime layout, so that copy path is not a reliable runtime environment. Changed the build stage to create a Debian 12 virtual environment and copy `/venv`, matching the official distroless Python requirements example.

## Review Notes
Buildah and Podman were not installed in the local environment, so command validation was performed against the upstream manuals and official project examples rather than local `--help` output. The size numbers are acceptable as typical approximate values, but they can vary by architecture, image update, and local storage accounting.
