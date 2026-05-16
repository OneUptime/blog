# Validation Summary: How to Deploy GitLab Runner on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- GitLab Runner (Kubernetes executor)
- Kubernetes
- Helm v3
- MinIO (S3-compatible object storage for build cache)
- GitLab CI/CD (`.gitlab-ci.yml`)
- Kaniko (container image builds)
- Prometheus (metrics)
- Go (example pipeline language)

## Sources Consulted
- GitLab Runner Helm chart: https://gitlab.com/gitlab-org/charts/gitlab-runner
- GitLab Runner Kubernetes executor configuration: https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab Runner advanced configuration: https://docs.gitlab.com/runner/configuration/advanced-configuration.html
- Official MinIO Helm chart: https://github.com/minio/minio/tree/master/helm/minio
- GitLab CI/CD reference (`artifacts:reports:coverage_report`): https://docs.gitlab.com/ee/ci/yaml/artifacts_reports.html
- Kaniko: https://github.com/GoogleContainerTools/kaniko

## Issues Found

1. **Invalid `[runners.kubernetes.cleanup]` TOML section with `delete_grace_period`.**
   The Kubernetes executor does not expose a `[runners.kubernetes.cleanup]` sub-table or a `delete_grace_period` field. The supported flat fields under `[runners.kubernetes]` are `cleanup_grace_period_seconds` and `pod_termination_grace_period_seconds`. Replaced the invalid sub-table with these two fields set to `30` to preserve the author's intent.

2. **MinIO `defaultBuckets` flag does not exist in the official MinIO Helm chart.**
   `defaultBuckets` is a Bitnami-chart convention. The official MinIO chart (the one served from `https://charts.min.io/`, which the post adds) uses a `buckets` array of objects with `name`, `policy`, `purge`, etc. Updated the `helm install minio` invocation to set `buckets[0].name=gitlab-runner-cache`, `buckets[0].policy=none`, and `buckets[0].purge=false` so the bucket is actually auto-created.

## Review Notes
- The GitLab Runner Helm chart has been migrating toward the new authentication-token model (`glrt-` prefix). With `glrt-` tokens, runner tags and the executor type are configured at runner creation time in the GitLab UI; the chart values `runners.tags` and `runners.executor` are now effectively no-ops for those tokens (the executor must be set inside the `runners.config` TOML, which the post already does correctly). The post still lists `runners.tags` and `runners.executor` as top-level values — they remain accepted by the chart for backward compatibility, so this was left as-is, but readers using `glrt-` tokens should be aware tags are assigned in the UI.
- The "Resource Management" heading on line 340 is missing the `##` markdown prefix and renders as plain text rather than a section header. This is a formatting/stylistic issue, not a technical one, so it was left unchanged per the review scope.
- The S3 cache example uses `minioadmin/minioadmin` credentials inline; this is acceptable as a quick-start example but production deployments should source these from a Kubernetes Secret (the post does mention using a secret in a comment for the runner token, but not for cache credentials).
- The `[runners.kubernetes]` block in the cache section repeats `namespace = "gitlab-runner"` as a partial config snippet — readers should merge it into their main config rather than duplicate the `[[runners]]` block. This is reasonably clear from the surrounding text.
