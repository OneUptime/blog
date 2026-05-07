# Validation Summary: How to Use the Podman REST API with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman REST API
- Python
- `requests`
- `requests-unixsocket`
- Unix domain sockets
- Container automation

## Sources Consulted
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference page: https://docs.podman.io/en/latest/_static/api.html
- Podman generated OpenAPI spec used by the reference page: https://storage.googleapis.com/libpod-master-releases/swagger-v5.7.yaml
- Podman `podman generate spec` documentation: https://docs.podman.io/en/stable/markdown/podman-generate-spec.1.html
- Podman source for log stream behavior: https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/compat/containers_logs.go
- Podman source for image pull response behavior: https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/libpod/images_pull.go
- Podman source for stats endpoint behavior: https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/libpod/containers_stats.go
- Podman source for exec behavior: https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/compat/exec.go
- Podman source for info/socket fields: https://raw.githubusercontent.com/containers/podman/main/libpod/define/info.go
- `requests-unixsocket` package documentation: https://pypi.org/project/requests-unixsocket/

## Issues Found
- The post hardcoded `/run/podman/podman.sock` everywhere, which only matches the rootful default. I updated the connection and standalone examples to use `$XDG_RUNTIME_DIR/podman/podman.sock` when available, with `/run/podman/podman.sock` as the rootful fallback, matching Podman’s documented defaults.
- The examples used the older `v4.0.0` path segment. I updated them to `v5.0.0`, which matches the current official examples.
- `pull_image()` called the libpod `/images/pull` endpoint through the generic JSON helper, but that endpoint streams JSON by default. I changed the client example to use `quiet=True`, which returns a single JSON payload and makes the method work as written.
- The stats example used the deprecated single-container `/libpod/containers/{name}/stats` endpoint, referenced non-existent `NetInput` and `NetOutput` fields, and omitted the required `json` import. I switched it to `/libpod/containers/stats`, summed `Network.*.RxBytes` and `TxBytes`, and fixed the imports.
- The log examples treated `/libpod/containers/{name}/logs` as plain text, but Podman documents and implements this as a Docker-style framed stream. I added decoding for the multiplexed log frames before printing lines.
- The exec example treated exec output as plain text without accounting for framed streams. I changed the example to create the exec session with `Tty=True`, which makes the example’s `response.text` handling correct for that case, and added missing `raise_for_status()` checks.

## Review Notes
- Podman’s API remains versioned, but the `podman system service` docs note that the server does not reject unsupported version strings in the URL path.
- The current docs mark `/libpod/containers/{name}/stats` as deprecated in favor of `/libpod/containers/stats`; the post now uses the non-deprecated form.
- The exec example now uses `Tty=True`, which returns a raw combined stream. That is correct for the article’s simple output-capture example, but it also means stdout and stderr are no longer separated.
