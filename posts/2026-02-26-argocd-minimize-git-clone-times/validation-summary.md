# Validation Summary: How to Minimize Git Clone Times in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD repo-server
- Argo CD Application manifests and repository configuration
- Git clone, fetch, shallow clone, mirror clone, and protocol v2
- Kubernetes Deployment and emptyDir tmpfs volumes
- Prometheus metrics and PromQL

## Sources Consulted
- Argo CD high availability and repo-server guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD private repository SSH credential documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD repo-server metrics package reference: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/reposerver/metrics
- Git protocol v2 documentation: https://git-scm.com/docs/gitprotocol-v2/2.49.0.html
- Git `git-clone` documentation: https://git-scm.com/docs/git-clone.html
- Git `git-fetch` documentation: https://git-scm.com/docs/git-fetch.html
- Kubernetes emptyDir volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The post claimed ArgoCD clones the repository every time manifests are generated. Argo CD documents that repo-server maintains a local repository clone and keeps it up to date, so I changed the wording to describe clone/fetch behavior on cold caches and cache misses.
- The post claimed ArgoCD performs shallow clones by default for branch or tag target revisions. Current Argo CD docs state that `argocd repo add` defaults to a full clone with depth 0 unless a custom `--depth` is configured, so I added the `argocd repo add ... --depth 1` example and adjusted the branch/tag guidance.
- The Git protocol v2 example used `GIT_PROTOCOL: "2"`. Git protocol documentation uses `version=2`, so I corrected the environment variable value and removed the unrelated `GIT_HTTP_POST_BUFFER` clone-performance recommendation.
- The SSH section overstated SSH as generally faster than HTTPS. I changed it to a benchmark-dependent recommendation because neither Argo CD nor Git documentation supports SSH as universally faster.
- The tmpfs section claimed local I/O becomes instant and disk I/O is eliminated. Kubernetes documents memory-backed `emptyDir` as tmpfs and fast, but not instant; I softened this to "much faster" and "reduces disk I/O."
- The PromQL histogram query did not aggregate buckets by `le`, and the request-type examples used cumulative sums directly. I corrected the p95 query and replaced the request-type examples with rate-based average duration by `request_type`.

## Review Notes
The remaining performance numbers are illustrative and environment-dependent. The post now says to benchmark transport and protocol changes rather than presenting fixed improvement percentages.
