# Validation Summary: How to List Containers with Podman Python SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Python SDK
- Python
- Container listing, filtering, inspection, and stats

## Sources Consulted
- Podman Python SDK container manager documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.containers_manager.html
- Podman Python SDK container model documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.containers.html
- Podman Python SDK PyPI project page and example usage: https://pypi.org/project/podman/
- Podman REST API container list and stats documentation: https://docs.podman.io/en/v3.0/_static/api-static.html
- Podman `podman ps` command documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html

## Issues Found
- Listed container objects are sparse by default, so reading fields such as `status`, `ports`, `attrs`, and image details directly after `containers.list()` can be incomplete or unreliable. Added `container.reload()` before examples access detailed container properties from listed containers.
- The detailed inspection example described full inspection data but used `container.attrs` from a listed object. Changed it to use `container.inspect()`, which is the SDK method documented for retrieving full inspection data.
- `container.stats(stream=False)` can return raw bytes unless decoding is requested. Changed the stats example to `container.stats(stream=False, decode=True)` before treating the result as a dictionary.

## Review Notes
The examples are syntactically valid Python. They require a running Podman API service/socket accessible to `PodmanClient`; the SDK defaults to the user runtime Podman socket when `base_url` is not provided.
