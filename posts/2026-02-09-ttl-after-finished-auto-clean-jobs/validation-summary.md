# Validation Summary: How to Use TTL After Finished Controller to Auto-Clean Completed Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs
- Kubernetes TTL-after-finished controller
- Kubernetes CronJobs
- kubectl
- jq
- Kubernetes Python client
- Prometheus scrape annotations

## Sources Consulted
- Kubernetes documentation: Automatic Cleanup for Finished Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes API reference: Job v1 batch: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes documentation: Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes documentation: CronJob: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation: Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl reference: kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl reference: kubectl patch: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Official Kubernetes Python client repository: https://github.com/kubernetes-client/python
- Kubernetes Python client generated model docs: https://k8s-python.readthedocs.io/en/stable/kubernetes.client.models.html

## Issues Found
- The success-versus-failure workaround used `restartPolicy: OnFailure` with the default Job retry behavior. A failed container would be retried according to the Job backoff limit, so the stated "about an hour" failure retention would not reliably hold. I changed the example to use `restartPolicy: Never` and `backoffLimit: 0` so the failed path sleeps once, exits non-zero, and then starts the 5-minute TTL.
- The metrics example placed Prometheus scrape annotations on the Job metadata. Pod-based scrape discovery typically needs those annotations on the Pod template metadata, so I moved them under `spec.template.metadata.annotations`.
- The metrics example described a 120-second TTL as if it started when the application work finished. Kubernetes TTL starts after the Job reaches a terminal `Complete` or `Failed` condition, which happens after the container exits. I changed the TTL to 30 seconds and clarified that the 90-second sleep keeps metrics available before the Job is marked complete.
- The post described TTL expiration and `ttlSecondsAfterFinished: 0` as immediate deletion guarantees. Kubernetes documents this as the Job becoming eligible for automatic cascading deletion. I updated the wording to avoid implying synchronous deletion.
- The TTL removal section said removing the field makes a completed Job persist indefinitely without caveat. Kubernetes does not guarantee retention if the existing TTL has already expired, so I clarified that the patch should be applied before expiration and only protects Jobs that have not already become eligible for deletion.

## Review Notes
The remaining examples use current `batch/v1` Job and CronJob APIs, valid Job `restartPolicy` values, valid `ttlSecondsAfterFinished` field names, and plausible kubectl/json patch usage. `kubectl` was not installed in the local workspace, so CLI validation was performed against the official generated kubectl reference rather than local `--help` output.
