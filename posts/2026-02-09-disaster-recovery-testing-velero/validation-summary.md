# Validation Summary: How to Build Disaster Recovery Testing Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero
- Kubernetes
- Kubernetes CronJobs
- kubectl
- Bash
- jq
- GitHub Actions

## Sources Consulted
- Velero Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero GitHub Releases: https://github.com/velero-io/velero/releases
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Azure k8s-set-context action documentation: https://github.com/Azure/k8s-set-context
- GitHub actions/upload-artifact deprecation notice: https://github.com/actions/upload-artifact

## Issues Found
- The DR test framework wrote the report to a timestamped filename and then read a newly generated timestamped filename, which could fail if the timestamp changed. Added a single `REPORT_FILE` variable and reused it for writing and reading.
- `RECORD_COUNT` could be blank when no PostgreSQL deployment was present. Initialized it to `N/A` so the generated report remains clear.
- The `kubectl run` examples used `-it` in automated contexts and did not force the command override. Replaced those calls with non-interactive `--attach=true --command --` invocations so they work in CronJobs and CI.
- The CronJob used `bitnami/kubectl:latest`, but the script also requires `velero`, `jq`, `bash`, and `curl`. Replaced it with a placeholder custom tool image and documented the required tools inline.
- The CronJob set `KUBECONFIG` to `/var/run/secrets/kubernetes.io/serviceaccount/kubeconfig`, which is not a standard mounted service account kubeconfig file. Removed the setting so in-cluster authentication can use the service account token.
- The PVC validation used `--field-selector=status.phase!=Bound`; Kubernetes field selectors are resource-specific and PVC status phase is not listed as a supported field selector. Replaced it with JSON output filtered by `jq`.
- The service endpoint validation used the deprecated Endpoints API. Replaced it with EndpointSlice-based validation using the `kubernetes.io/service-name` label.
- The GitHub Actions workflow omitted repository checkout before running `./scripts/dr-test-framework.sh`. Added `actions/checkout@v4`.
- The GitHub Actions workflow used older action versions: `azure/k8s-set-context@v1` and `actions/upload-artifact@v2`. Updated them to current maintained versions and added `method: kubeconfig` for the kubeconfig approach.
- The Velero CLI install step pinned the old `v1.12.0` release. Updated the example to `v1.18.1`, matching the current Velero release line found during review.

## Review Notes
The examples remain intentionally generic and assume application-specific names such as `production`, `postgres`, `frontend`, `api`, and `mydb`. In real environments, teams should adapt namespace mappings, service names, database credentials, RBAC, and tool images to their own cluster and security model.
