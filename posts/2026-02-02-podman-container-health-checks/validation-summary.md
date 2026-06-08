# Validation Summary: How to Build Podman Container Health Checks

## Status
validated

## Post Type
Tutorial / Hands-on Guide

## Technologies Covered
- Podman (HEALTHCHECK, healthcheck run, pods, generate systemd)
- Containerfile / Dockerfile HEALTHCHECK instruction
- Bash shell scripting (custom healthcheck scripts)
- systemd (user units, Restart policy, ExecStart/ExecStop)
- Express.js (Node.js) for `/health` and `/ready` endpoints
- Redis, nginx, PostgreSQL (as example containers/dependencies)
- Mermaid diagrams (flowchart, stateDiagram-v2)

## Sources Consulted
- Podman official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html (verified `--health-cmd`, `--health-interval`, `--health-timeout`, `--health-retries`, `--health-start-period`, `--no-healthcheck` flags)
- Podman healthcheck command: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman inspect: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html (verified `.State.Health` structure: `Status`, `FailingStreak`, `Log`)
- Podman generate systemd: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html (deprecated since Podman 4.4 but still functional)
- Podman pod commands: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Dockerfile HEALTHCHECK reference: https://docs.docker.com/reference/dockerfile/#healthcheck (Podman is compatible)
- systemd.unit/systemd.service documentation (for Restart, ExecStartPre, Type directives)

## Issues Found
No technical issues found. All code examples, CLI commands, flags, and configuration snippets are syntactically correct and reflect current Podman behavior. The HEALTHCHECK instruction syntax matches the Docker reference that Podman implements. The `.State.Health` JSON shape matches what `podman inspect` emits. Runtime `--health-*` flags and the `podman healthcheck run` subcommand are accurate.

## Review Notes
- **`podman generate systemd` deprecation**: This command was deprecated in Podman 4.4 (2023) in favor of Quadlet (`.container` unit files placed under `~/.config/containers/systemd/`). It still functions in current Podman releases and emits a deprecation warning. A future revision of the post could mention Quadlet as the modern alternative, but the current instructions remain operational.
- **nginx:alpine example**: The pod example uses `curl -f http://localhost:80/health` against `nginx:alpine`, which does not ship with `curl` and has no `/health` endpoint by default. The snippet is illustrative of the flag syntax rather than a working production check; readers building a real nginx healthcheck would need to install `curl`/`wget` in a derived image, use `wget --spider`, or add a custom location block. Not incorrect as a syntax demonstration.
- **`nc` availability in healthcheck script**: The custom script uses `nc -z localhost 5432` which assumes `netcat` is present in the runtime image. Many minimal base images (e.g., alpine, distroless) do not include it. Authors adapting the script should verify the tool exists in their image. This is a common caveat, not a correctness issue with the example.
- **User unit `After=network-online.target`**: For rootless (user) systemd units, `network-online.target` is provided by the system instance and is typically reachable, but some distros' user instances treat it as a no-op. Behavior is fine in practice.
- Mermaid diagrams render correctly and the state machine accurately reflects Podman/Docker health check semantics (starting → healthy/unhealthy with retry-driven transitions).
