# Validation summary

## Checks performed

- Promtool 3.7.3 evaluated four assertions for root-only and root-plus-application fixtures; raw identities and non-root selection behaved as described.
- All published Docker inspection, info, context and logs snippets passed bash syntax checks and official option review.
- Reviewed cAdvisor 0.55.1 Docker factory initialization/recognition and raw-root filtering paths.
- Five-edge Mermaid diagnostic flow structurally checked; not graphically rendered.
- Generated social image visually reviewed at 1280x720; readable title without clipping.

## Limitations

- No live Docker discovery repair, rootless runtime, namespace adjustment or host permission change was performed.
- Synthetic query checks do not establish discovery coverage for an actual fleet.
- Source details are scoped to cAdvisor 0.55.1 and must be rechecked for other embedded/runtime builds.

## Reviewed sources

- https://github.com/google/cadvisor/blob/v0.55.1/container/docker/factory.go
- https://github.com/google/cadvisor/blob/v0.55.1/container/raw/factory.go
- https://docs.docker.com/engine/manage-resources/contexts/
- https://docs.docker.com/reference/cli/docker/system/info/
- https://docs.docker.com/engine/security/rootless/tips/
- https://docs.docker.com/reference/cli/docker/container/inspect/
- https://docs.docker.com/reference/cli/docker/container/logs/
- https://github.com/google/cadvisor/blob/v0.55.1/docs/running.md
- https://man7.org/linux/man-pages/man7/cgroup_namespaces.7.html
- https://docs.docker.com/engine/security/#docker-daemon-attack-surface

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
