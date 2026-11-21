# Validation summary

## Checks performed

- Prometheus 3.7.3 promtool evaluated the published query against total-counter and two-per-CPU-counter fixtures; both returned 150 percent for 1.5 cores.
- Verified four arithmetic examples for core usage, Docker-style percent, host fraction and quota fraction.
- Reviewed Docker CLI 28.0.0 Linux CPU calculation and fallback CPU-count behavior in official source; the Docker helper itself was not executed.
- Published shell snippets passed bash syntax checking; official CLI options reviewed.
- Six-edge Mermaid flow structurally checked, not rendered; generated 1280x720 social image visually reviewed without clipping.

## Sources reviewed

- https://github.com/docker/cli/blob/v28.0.0/cli/command/container/stats_helpers.go
- https://docs.docker.com/reference/cli/docker/container/stats/
- https://docs.docker.com/reference/cli/docker/container/inspect/
- https://github.com/google/cadvisor/blob/v0.55.1/metrics/prometheus.go
- https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- https://docs.docker.com/engine/containers/resource_constraints/#cpu

## Limitations

- No Docker daemon, real CPU load or end-to-end comparison of collection windows was run.
- The illustrative host and quota values are not fleet configuration recommendations.
- Linux formula review does not describe Windows Docker CPU calculation.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
