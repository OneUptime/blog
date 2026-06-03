# Validation Summary: How to Build Automated Velero Backup Verification Tests Using Restore Jobs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Velero
- Kubernetes Jobs and CronJobs
- Kubernetes service accounts and in-cluster API access
- kubectl
- Bash scripting
- jq
- PrometheusRule / kube-state-metrics
- GitHub Actions

## Sources Consulted
- Velero v1.18 restore reference: https://velero.io/docs/v1.18/restore-reference/
- Velero v1.12 restore CLI help, checked from the official v1.12.0 release binary: https://github.com/vmware-tanzu/velero/releases/tag/v1.12.0
- Velero v1.12 release instructions noting the official image is Distroless: https://velero.io/docs/v1.12/release-instructions/
- Velero v1.18.1 GitHub release: https://github.com/velero-io/velero/releases/tag/v1.18.1
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kube-state-metrics Job metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/job-metrics.md
- Azure k8s-set-context GitHub Action documentation: https://github.com/Azure/k8s-set-context

## Issues Found
- The Job and CronJob examples used `velero/velero:v1.12.0` while invoking `/bin/bash`, `kubectl`, and `jq`. The official Velero image is Distroless and does not provide those tools, so the examples would not run. Changed the examples to use purpose-built verifier images and added notes about the required tools.
- The examples used Velero v1.12.0, which is no longer the current maintained release line. Updated image and download references to Velero v1.18.1.
- The inline `bash -c` examples expected the first Kubernetes `args` entry to appear as `$1`, but with `bash -c` it becomes `$0` unless a dummy argument is provided. Added dummy arguments before the real script inputs.
- The basic restore example queried `velero restore get test-restore-* -o json`, which is not a valid way to fetch a named restore status and depends on shell glob behavior. Replaced it with `kubectl get restores.velero.io ... -o jsonpath`.
- The comprehensive script used `velero backup get $BACKUP_NAME -o json` even though `velero backup get` lists backups and does not accept a backup name argument. Replaced it with `kubectl get backups.velero.io "$BACKUP_NAME" -n velero -o json`.
- The comprehensive script used `velero restore describe $RESTORE_NAME -o json`, but `velero restore describe` in v1.12 does not support `-o json`. Replaced it with `kubectl get restores.velero.io "$RESTORE_NAME" -n velero -o json`.
- The CronJob set `KUBECONFIG` to `/var/run/secrets/kubernetes.io/serviceaccount/kubeconfig`, which is not the standard service account credential path and can break in-cluster client configuration. Removed the override so clients use in-cluster configuration.
- The PVC check used a field selector on `status.phase!=Bound`, which is not a portable supported PVC field selector. Replaced it with a JSON query through `jq`.
- The validation snippets used `kubectl run --rm -it` inside automation. Removed TTY allocation and used `--attach` with `--restart=Never` so the command is appropriate for non-interactive Jobs.
- The application-specific validation Job used `postgres:15` while invoking `kubectl`, which is not included in the standard PostgreSQL image. Changed it to a purpose-built validator image and documented that it must include `bash`, `kubectl`, and PostgreSQL client tools.
- The Prometheus failed-job alert used `kube_job_status_failed`, which counts failed pods and can be misleading for retried Jobs. Replaced it with `kube_job_failed{condition="true"}`.
- The missing-verification alert checked each old completed Job individually, which can alert even when a newer verification succeeded. Changed it to compare against the latest completion time and handle absent metrics.
- The GitHub Actions workflow used `azure/k8s-set-context@v1`. Updated it to the current documented `@v4` action.

## Review Notes
The examples still assume placeholder custom images and sample service names such as `myapp`, `api`, and `postgres`. Those are appropriate for a template-style tutorial, but production users should build and pin their own verifier images and adapt namespace mappings, service names, credentials, and RBAC to their applications.
