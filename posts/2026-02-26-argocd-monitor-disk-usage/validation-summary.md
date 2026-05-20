# Validation Summary: How to Monitor ArgoCD Disk Usage

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Grafana dashboards
- Redis persistence
- kubelet/cAdvisor and kube-state-metrics metrics

## Sources Consulted
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD repo server command documentation: https://argo-cd.readthedocs.io/en/release-2.6/operator-manual/server-commands/argocd-repo-server/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD installation manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes resource management documentation for local ephemeral storage: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- GKE cAdvisor/Kubelet metrics reference for `container_fs_usage_bytes` and `container_fs_limit_bytes`: https://cloud.google.com/kubernetes-engine/docs/how-to/cadvisor-kubelet-metrics
- Alpine Linux release branches: https://alpinelinux.org/releases/
- Redis persistence documentation: https://redis.io/docs/latest/operate/rc/databases/configuration/data-persistence/

## Issues Found
- The post said the application controller writes temporary files during manifest generation. Argo CD's repo server is responsible for generating and returning manifests, so the introduction and component description were updated to describe the controller's `/tmp` and Kubernetes client cache usage instead.
- The post described the bundled Dex server as storing a SQLite database. Argo CD documentation states the bundled Dex server uses an in-memory database, so this was corrected.
- The manual `kubectl exec` command targeted `deploy/argocd-application-controller`. The standard Argo CD manifest deploys the application controller as a StatefulSet, so the command now uses `statefulset/argocd-application-controller`.
- The Prometheus section implied the listed metrics are always available without prerequisites. It now clarifies that Prometheus must already scrape kubelet/cAdvisor and kube-state-metrics or kube-scheduler metrics.
- The sidecar YAML attempted to mount `/tmp` read-only and also write `/tmp/metrics`, and it did not read the shared repo-server temp volume from a separate mount path. The snippet now reads `/repo-tmp` read-only and writes the generated metric file under `/var/run/disk-monitor`.
- The sidecar used `alpine:3.19`, which is past standard support as of the review date. It was updated to `alpine:3.23`.
- The "reduce clone depth" recommendation used `reposerver.git.request.timeout`, which configures Git request timeout and does not enable shallow clones. This was replaced with a supported `reposerver.enable.git.submodule: "false"` example.
- The monorepo `path` recommendation implied that using a subpath avoids cloning the entire repository. The text now clarifies that `path` affects rendering scope, while reducing clone size requires smaller repositories or removing large artifacts from Git.
- The repo cache expiration recommendation implied direct disk reduction. The text now explains what `reposerver.repo.cache.expiration` controls and notes that it is not a direct cleanup setting.

## Review Notes
The container filesystem metrics and PVC metrics are valid, but exact availability and labels vary by Kubernetes distribution, scrape configuration, and kube-state-metrics or kube-scheduler version. The post now calls out those prerequisites at a high level.
