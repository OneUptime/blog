# Validation Summary: How to Manage Volumes with Podman Python SDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Python SDK
- Python
- Container volumes
- Linux bind mounts and `tar`-based backups

## Sources Consulted
- Podman Python SDK volume manager documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.volumes.html
- Podman Python SDK container create/run volume parameter documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.containers_create.html
- Podman Python SDK 5.8.0 package metadata on PyPI: https://pypi.org/project/podman/
- Podman `podman volume create` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman `--volume` option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html

## Issues Found
- Volume list filters used list values such as `filters={"label": ["environment=production"]}`. In the Podman Python SDK, mapping-style filters are formatted as `dict[str, str]`; list values are stringified as `"['environment=production']"` instead of becoming the intended filter value. Changed the examples to use string values such as `filters={"label": "environment=production"}`.
- The managed-volume lifecycle example had the same list-valued label filter issue. Changed it to `filters={"label": "managed_by=volume-manager"}`.
- The backup example bind-mounted `/tmp/backups` by default but did not create that host directory first. Podman bind mounts require the host source path to exist. Added `import os` and `os.makedirs(backup_dir, exist_ok=True)` before starting the backup container.

## Review Notes
- The SDK methods used in the article, including `client.volumes.create`, `client.volumes.get`, `client.volumes.list`, `client.volumes.prune`, `Volume.remove(force=True)`, and `client.containers.run(..., volumes=...)`, match current Podman Python SDK documentation.
- Podman SDK usage requires a running Podman API service/socket. The examples rely on the SDK's default client connection behavior and may need an explicit `base_url` in environments where the default socket is not available.
- Driver options such as `type`, `device`, and `o` are valid for the local volume driver, but some mount options may require root privileges depending on the host and Podman configuration.
