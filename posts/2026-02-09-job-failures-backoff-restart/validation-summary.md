# Validation Summary: How to Troubleshoot Kubernetes Job Failures from Incorrect Backoff Limit

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes Jobs
- Kubernetes Pod restart policies
- kubectl
- Prometheus / kube-state-metrics
- YAML Kubernetes manifests

## Sources Consulted
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Automatic Cleanup for Finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics project documentation / repository: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The post described `backoffLimit` as counting only Pod failures and failing when the counter exceeds the limit. Updated it to match Kubernetes documentation: Kubernetes counts failed Pods, and for `restartPolicy: OnFailure` also counts container retries in `Pending` or `Running` Pods; the Job fails when either calculation reaches `.spec.backoffLimit`.
- The `restartPolicy: Never` failure description said each container failure creates a new Pod. Updated this to say each failed Pod is replaced by a new Pod, which is the accurate Job-controller behavior.
- The `OnFailure` example said retries preserve the Pod IP address and implied this is useful for debugging. Updated it to focus on preserving volumes while the Pod remains on the same node and to note that debugging can be harder because Kubernetes terminates the Job Pod when the backoff limit is reached.
- The `backoffLimit: 3` comment said it creates up to 3 Pods. Updated it to say it allows up to 3 failed Pods before the Job fails, matching the backoff counter semantics.
- The exponential backoff section described a "Job that fails 6 times" as having kubelet restart delays. Updated it to describe a repeatedly failing container, since the five-minute cap applies to kubelet container restarts; failed Pods recreated by the Job controller use a separate Job backoff capped at six minutes.
- The `backoffLimit: 2` comment in the `OnFailure` example said it allows 2 Pod failures. Updated it to say it keeps the Kubernetes-level retry count low, because for `OnFailure` the limit can be reached by container retries before multiple failed Pods exist.

## Review Notes
- `kubectl` was not installed in the local environment, so kubectl command validation was performed against the official generated kubectl reference.
- The Prometheus rule assumes kube-state-metrics is installed and scraped; kube-state-metrics is an add-on and is not part of the core Kubernetes API server.
