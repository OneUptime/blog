# Validation Summary: How to Connect to Podman with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Python SDK
- Python
- Podman REST API
- Unix sockets
- SSH connections
- TCP API connections
- systemd socket activation

## Sources Consulted
- Podman Python SDK `PodmanClient` documentation: https://podman-py.readthedocs.io/en/stable/podman.client.html
- Podman Python SDK source for `PodmanClient`: https://podman-py.readthedocs.io/en/stable/_modules/podman/client.html
- containers/podman-py official repository: https://github.com/containers/podman-py
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman` environment variable documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html

## Issues Found
- The default connection description stated that `PodmanClient()` connects to `unix:///run/user/{uid}/podman/podman.sock` by default. Current podman-py uses `http+unix://` internally and derives the local socket from `$XDG_RUNTIME_DIR`, with additional handling for active Podman machine services. Updated the text to describe a typical rootless Linux default more accurately.
- The TCP connection example used `http://localhost:8080` and the service command used `tcp:localhost:8080`. Current Podman documentation shows `tcp://localhost:8080` as the endpoint form, and podman-py accepts `tcp://` as a `base_url`. Updated both snippets and the section wording to refer to TCP consistently.
- The `get_podman_client(base_url=None)` example passed `base_url=None` directly to `PodmanClient`, which raises `ValueError` in current podman-py instead of falling back to the default socket. Updated the function to include `base_url` only when a value is provided.
- The environment-variable example used custom names `PODMAN_HOST` and `PODMAN_IDENTITY`. Podman and podman-py document `CONTAINER_HOST` for the service URL, and Podman documents `CONTAINER_SSHKEY` for SSH identity configuration. Updated the example to use those names while preserving the wrapper's behavior.

## Review Notes
The post is technically relevant and the corrected examples align with current Podman and podman-py behavior. The local review environment did not have the `podman` CLI installed, so CLI verification was done against official Podman documentation rather than local `--help` output.
