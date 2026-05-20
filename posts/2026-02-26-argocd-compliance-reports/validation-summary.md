# Validation Summary: How to Generate Compliance Reports from ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes CronJobs
- Kubernetes ConfigMaps
- Kyverno PolicyReports and ClusterPolicies
- OPA Gatekeeper metrics
- Prometheus / Grafana
- Bash and jq
- AWS CLI and Slack webhooks

## Sources Consulted
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD local user management documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kyverno Policy Reports documentation: https://kyverno.io/docs/policy-reports/background/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- OPA Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/

## Issues Found
- The deployment history script used `argocd app history "$APP" -o json`, but the current Argo CD command reference lists `wide|id` for `argocd app history` output. Changed the script to use `argocd app get "$APP" -o json` and read `.status.history[]?`.
- The deployment history script manually assembled JSON and lost the `FIRST` flag across pipeline subshells, which could produce invalid JSON for multiple applications. Replaced manual comma handling with `jq -s`.
- The deployment history script compared bare dates to timestamp fields. Changed comparisons to UTC timestamp boundaries and made the end date exclusive.
- The access report read local accounts from the ConfigMap top level instead of `.data`. Updated the jq query to inspect `.data`, ignore `accounts.<user>.enabled` keys as standalone accounts, and report account enabled state.
- The drift report assumed `.status.resources` was always present. Added a `// []` fallback before counting out-of-sync resources.
- The policy report used Kyverno's deprecated top-level `spec.validationFailureAction`. Updated it to read per-rule `validate.failureAction`.
- The policy report introduction said the script covered Kyverno or Gatekeeper, but the code only queried Kyverno resources. Clarified that Gatekeeper audit results are available through constraint status and metrics.
- The CronJob manifest used `volumMounts`, which is not a valid Kubernetes container field. Corrected it to `volumeMounts`.
- The CronJob archived `access-report-*.json`, `drift-report-*.json`, and `policy-report-*.json`, but those scripts wrote to stdout and did not create matching files. Redirected their output into report files under `/reports` and archived those exact files.
- The Grafana examples used unsupported or incorrect metric names/labels: `argocd_app_info{autosync_enabled="true"}`, `argocd_app_sync_total_seconds`, and `increase(gatekeeper_violations[1h]) by (constraint)`. Replaced them with documented Argo CD and Gatekeeper metrics and labels.

## Review Notes
- I could not run `argocd`, `kubectl`, `shellcheck`, or Kubernetes schema validation in this local environment because those tools are not installed. I validated jq filters with local sample data and checked CLI/API details against official documentation.
- The CronJob still assumes the custom reporter image contains the Argo CD CLI, kubectl, jq, AWS CLI, curl, the report scripts, credentials, and a `date` implementation that supports `-d`.
