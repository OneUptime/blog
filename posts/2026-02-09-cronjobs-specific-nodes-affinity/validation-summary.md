# Validation Summary: How to Set Up CronJobs That Run Only on Specific Nodes Using Affinity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes CronJobs
- Kubernetes Jobs and Pods
- Node selectors
- Node affinity and pod anti-affinity
- Taints and tolerations
- kubectl
- PersistentVolumeClaims

## Sources Consulted
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes Assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Toleration API reference: https://kubernetes.io/docs/reference/kubernetes-api/definitions/toleration-v1/
- Kubernetes Taints and Tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Well-Known Labels, Annotations and Taints reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes CronJob concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The batch isolation example used `requiredDuringSchedulingIgnoredDuringExecution` node affinity but described the node label rule as a preference. Updated the explanation to say the node label is required and the pod anti-affinity is preferred.
- The taints and tolerations example used `nodeSelector: workload: batch` but only showed tainting nodes. Added matching `kubectl label nodes ... workload=batch` commands so the CronJob can satisfy its node selector.
- The regional data processing explanation said the job runs in the same zone as the persistent volume. Updated it to state that the job runs in `us-west-2a`, which should match the persistent volume's zone.
- The verification commands used a nonstandard `cronjob-name` pod label and the deprecated unprefixed `job-name` label. Updated the commands to find the latest CronJob-created Job by name prefix and select pods using `batch.kubernetes.io/job-name`.
- The verification commands used unquoted shell variables. Updated the commands to quote `$POD`.

## Review Notes
The YAML examples use the current `batch/v1` CronJob API and valid Pod scheduling fields. Local `kubectl` was not installed in the workspace, so command verification was performed against the official Kubernetes kubectl reference and API documentation.
