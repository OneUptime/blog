# Validation Summary: How to Use successfulJobsHistoryLimit and failedJobsHistoryLimit in CronJobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CronJobs
- Kubernetes Jobs
- kubectl
- Kubernetes Python client

## Sources Consulted
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob batch/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes TTL-after-finished controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch
- Kubernetes CronJob controller source for Job labels and owner references: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.34.0/pkg/controller/cronjob/utils.go
- Official Kubernetes Python client repository: https://github.com/kubernetes-client/python

## Issues Found
- The introduction implied CronJob Jobs accumulate indefinitely without cleanup, but Kubernetes defaults retain 3 successful Jobs and 1 failed Job. Updated the wording to clarify that accumulation happens when cleanup is disabled or limits are set too high.
- The cleanup explanation described deletion as being triggered by a newly completed or failed Job. Updated it to describe the CronJob controller behavior more generally: it keeps the newest matching completed or failed Jobs and removes older ones.
- The querying examples used `cronjob-name=backup-job` as if Kubernetes automatically adds that label. The CronJob controller copies labels from `spec.jobTemplate.metadata.labels` but does not add a `cronjob-name` label by default, so the backup CronJob example now explicitly adds that label.
- The failed Job count used `--field-selector=status.failed=1`, but Kubernetes only documents `status.successful` as a supported Job-specific field selector. Replaced the failed count command with a Go-template filter over Job conditions.
- The successful Job count command counted the header row. Added `--no-headers`.
- The Python monitoring example selected Jobs by a non-automatic label and treated explicit limit values of `0` as missing because it used `or` defaults. Updated it to match Jobs by CronJob owner reference and to preserve explicit zero values.

## Review Notes
The YAML examples use current `batch/v1` CronJob fields. `ttlSecondsAfterFinished` is stable for Jobs as of Kubernetes v1.23 and is valid under the CronJob `jobTemplate.spec`.
