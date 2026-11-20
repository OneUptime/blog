# Validation summary

## Checks performed

- Promtool 3.7.3 executed the published selector against two device series and an unrelated host; both intended device values were retained and the other host excluded.
- Both Docker inspection examples passed bash syntax checks and were reviewed against official inspect documentation.
- Read cAdvisor 0.55.1 Docker handler, filesystem conversion, common directory scanner and exporter source to trace total usage, capacity and scan timing.
- Mermaid structure checked for six edges and declared nodes; no graphical rendering.
- Social image generated and visually reviewed at 1280x720; readable title without clipping.

## Limitations

- No Docker runtime was available; inspect commands and staging storage experiment were not executed.
- PromQL fixture uses synthetic data and does not validate actual filesystem attribution.
- Source conclusions are scoped to the examined Docker path, not all storage drivers, snapshotters or embedded kubelet versions.

## Reviewed sources

- https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- https://docs.docker.com/engine/storage/volumes/
- https://github.com/google/cadvisor/blob/v0.55.1/metrics/prometheus.go
- https://github.com/google/cadvisor/blob/v0.55.1/container/docker/handler.go
- https://github.com/google/cadvisor/blob/v0.55.1/container/common/fsHandler.go
- https://github.com/google/cadvisor/blob/v0.55.1/container/docker/fs.go
- https://docs.docker.com/reference/cli/docker/container/inspect/
- https://github.com/prometheus/node_exporter#enabled-by-default
- https://docs.docker.com/engine/logging/configure/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
