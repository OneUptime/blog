# Validation Summary: How to Install the Podman Python SDK

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman
- Podman Python SDK / podman-py
- Python
- pip
- Python virtual environments
- systemd user and system services
- Podman machine on macOS

## Sources Consulted
- Podman-py README: https://github.com/containers/podman-py
- Podman-py latest client API documentation: https://podman-py.readthedocs.io/en/latest/podman.client.html
- Podman-py 5.8.0 project metadata / pyproject.toml: https://raw.githubusercontent.com/containers/podman-py/v5.8.0/pyproject.toml
- Podman package on PyPI: https://pypi.org/project/podman/
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman installation documentation: https://podman.io/docs/installation
- Podman machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html

## Issues Found
- The prerequisites stated that Python 3.6 or later was sufficient. Current podman-py metadata requires Python 3.9 or later, so the post now says Python 3.9 or later.
- The post recommended `pip install podman[dev]`, but podman-py does not publish a `dev` extra. The published optional extras include `test`, `docs`, and `progress-bar`, so the testing example now uses `pip install podman[test]`.
- The dependencies section described `tomli` as a general dependency. Current package metadata installs `tomli` only for Python versions before 3.11, so that caveat was added.

## Review Notes
The remaining commands and examples are technically consistent with the consulted official documentation. The guide uses `podman==5.0.0` as a pinning example; that version is valid but no longer the latest release as of this review.
