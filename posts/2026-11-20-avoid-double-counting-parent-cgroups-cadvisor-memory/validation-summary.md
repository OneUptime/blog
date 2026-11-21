# Validation summary

## Checks performed

- Prometheus 3.7.3 promtool evaluated eight assertions across normal hierarchy, missing image, missing container label and duplicate scrape fixtures.
- Application total was 580 MiB with parent/sandbox excluded; missing image retained the total, missing container reduced it to 180 MiB, duplicate application produced 980 MiB and multiplicity two.
- Five-edge Mermaid hierarchy structurally checked; not graphically rendered.
- Social image generated and visually inspected at 1280x720; readable unclipped title.

## Sources reviewed

- https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- https://github.com/google/cadvisor/blob/v0.55.1/container/libcontainer/handler.go
- https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/kubelet/server/server.go
- https://prometheus.io/docs/prometheus/latest/querying/basics/
- https://prometheus.io/docs/prometheus/latest/querying/operators/

## Limitations

- No live Kubernetes cluster, cgroup memory allocation experiment or dashboard deployment was performed.
- Query tests use synthetic series and do not prove completeness of actual runtime labels or sampling alignment.
- Source interpretation scoped to cAdvisor 0.55.1 and Kubernetes 1.35.0.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
