# Validation Summary: How to Deploy GitLab on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- GitLab (CE/EE)
- Rancher (v2.7+)
- Kubernetes
- Helm
- cert-manager
- Longhorn (storage)
- NGINX Ingress
- Prometheus / ServiceMonitor (kube-prometheus-stack CRD)
- Kubernetes HorizontalPodAutoscaler (autoscaling/v2)
- Kubernetes CronJob (batch/v1)
- AWS CLI (for S3 backup)

## Sources Consulted
- Official GitLab Helm chart documentation: https://docs.gitlab.com/charts/
- GitLab Helm chart repository: https://charts.gitlab.io/
- Bitnami chart catalog (to confirm Bitnami's GitLab chart was deprecated/removed)
- Helm CLI reference: https://helm.sh/docs/helm/helm_install/
- Kubernetes HPA v2 reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- Kubernetes CronJob (batch/v1) reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator ServiceMonitor CRD: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.ServiceMonitor
- cert-manager Helm/cluster-issuer documentation: https://cert-manager.io/docs/

## Issues Found
1. **Multiple "ugitlab" typos** — The post contained several occurrences of "ugitlab" (in the introduction, install/upgrade comments, and conclusion). Replaced with "GitLab".
2. **Incorrect Helm chart source** — The post used `bitnami/gitlab`, but Bitnami's GitLab chart has been deprecated/removed and is no longer the recommended source. Replaced with the official GitLab Helm chart at `https://charts.gitlab.io/` (chart `gitlab/gitlab`), which is the canonical maintained chart.
3. **Invalid `--version latest` flag** — `helm install --version` accepts a semver constraint, not the literal string `latest`. Passing `latest` causes a parse failure. Removed the flag so Helm installs the latest version by default.
4. Updated the upgrade command to use the same `gitlab/gitlab` chart name for consistency.

## Review Notes
- The values structure shown in `gitlab-values.yaml` is a generic, simplified illustration. The real official `gitlab/gitlab` chart uses an umbrella structure with keys like `global.hosts.domain`, `global.hosts.https`, `certmanager-issuer.email`, `gitlab.webservice.*`, `gitlab.sidekiq.*`, etc. Readers will need to consult https://docs.gitlab.com/charts/installation/command-line-options.html for the actual schema. The post's example values are kept as-is because they read as a high-level template rather than copy-paste configuration.
- The `kubectl rollout status deployment/gitlab` and HPA `scaleTargetRef.name: gitlab` commands assume a single `gitlab` Deployment. The official chart actually creates multiple deployments (`gitlab-webservice-default`, `gitlab-sidekiq-all-in-1-v2`, etc.). Operators using the official chart will need to target the relevant subcomponent. Left as-is since the post is positioned as an illustrative template.
- The backup CronJob assumes a `gitlab-data` PVC and a synced `/data` mount on the container; in practice, GitLab's recommended backup path is the built-in `backup-utility` job from the chart (`task-runner` / `toolbox` pod). The shown CronJob is reasonable as a generic data-sync example but is not GitLab's recommended backup mechanism.
- Rancher v2.7+ remains accurate as a supported baseline as of 2026-05-03; newer Rancher versions (v2.8, v2.9) are also supported.
