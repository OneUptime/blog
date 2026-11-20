# Validation summary

## Sources reviewed

- https://docs.docker.com/engine/security/rootless/
- https://docs.docker.com/engine/security/rootless/tips/#limiting-resources
- https://docs.kernel.org/admin-guide/cgroup-v2.html#cpu
- https://docs.docker.com/reference/cli/docker/context/inspect/
- https://docs.docker.com/engine/security/rootless/tips/
- https://github.com/google/cadvisor/blob/v0.55.1/container/docker/factory.go
- https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- https://docs.kernel.org/admin-guide/cgroup-v2.html
- https://docs.docker.com/engine/containers/runmetrics/
- https://github.com/google/cadvisor/blob/v0.55.1/docs/runtime_options.md
- https://docs.docker.com/engine/security/rootless/troubleshoot/

## Checks performed

- Python helper compiled and executed against real temporary file fixtures: readable contents, empty file, absent file, permission denial under non-root user, invalid directory and missing argument.
- All shell snippets passed sh -n. Docker and systemd inspection options reviewed against official docs.
- cAdvisor v0.55.1 Docker factory source and runtime flags reviewed. Mermaid seven-edge diagnostic structure checked.
- Repository social image generated and visually inspected.

## Limitations

- No Linux cgroup hierarchy, rootless Docker daemon, controller delegation, exporter mount or live scrape was tested; helper fixtures were ordinary local files.
- The article does not claim full rootless monitoring support or suggest blanket privilege changes. Host-specific coverage needs staging validation.
- Mermaid not rendered; no runtime services or controller settings changed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
