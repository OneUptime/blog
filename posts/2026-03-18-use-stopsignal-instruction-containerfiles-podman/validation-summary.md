# Validation Summary: How to Use STOPSIGNAL Instruction in Containerfiles for Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Containerfiles / Dockerfiles
- Compose specification
- Nginx
- Apache HTTP Server
- Node.js and npm
- Python
- Java

## Sources Consulted
- Podman `stop` documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman `kill` documentation: https://docs.podman.io/en/latest/markdown/podman-kill.1.html
- Podman `create` documentation (`--stop-signal`, `--stop-timeout`): https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman compose documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Dockerfile reference for `STOPSIGNAL`: https://docs.docker.com/reference/dockerfile
- Compose services reference (`stop_signal`, `stop_grace_period`): https://docs.docker.com/reference/compose-file/services/
- NGINX signal control documentation: https://nginx.org/en/docs/control.html
- Apache HTTP Server stopping and restarting documentation: https://httpd.apache.org/docs/current/en/stopping.html
- npm config documentation (`only` deprecation): https://docs.npmjs.com/cli/v11/using-npm/config/
- npm `ci` documentation (`omit`): https://docs.npmjs.com/cli/v10/commands/npm-ci/?v=true
- Python `socketserver` documentation (`shutdown()` threading requirement): https://docs.python.org/3/library/socketserver.html
- Java Runtime shutdown hooks API: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Runtime.html
- Java signal handling and shutdown hooks documentation: https://docs.oracle.com/en/java/javase/21/troubleshoot/handle-signals-and-exceptions.htm

## Issues Found
- The Node.js Containerfile used `npm ci --only=production`. I changed it to `npm ci --omit=dev` because npm documents `only` as a deprecated alias and `omit` as the current supported approach.
- The Python example called `HTTPServer.shutdown()` from the same thread that runs `serve_forever()`. Python documents that this can deadlock, so I changed the example to trigger `shutdown()` from a background thread and close the server in a `finally` block.
- The runtime override section mixed together two different behaviors. I clarified that `--stop-signal` overrides the configured stop signal when creating the container, while `podman kill --signal` sends a one-off signal manually.
- The compose section referred to `podman stop --timeout`, but current Podman documentation uses `podman stop --time`. I corrected that reference.

## Review Notes
- `podman compose` is a thin wrapper around an external compose provider, so compose-file behavior comes from the provider/spec rather than a separate native Podman compose implementation.
- Podman was not installed in the local workspace, so command validation was performed against official documentation rather than local CLI help output.
