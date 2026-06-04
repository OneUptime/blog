# Validation Summary: How to Chain Multiple Jobs in Sequence Using Init Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Jobs
- Kubernetes init containers
- Kubernetes RBAC and ServiceAccounts
- kubectl wait
- Kubernetes Python client
- PersistentVolumeClaims
- Argo Workflows
- Bash
- Python

## Sources Consulted
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes ServiceAccounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes client libraries documentation: https://kubernetes.io/docs/reference/using-api/client-libraries/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Python client repository: https://github.com/kubernetes-client/python
- Argo Workflows steps documentation: https://argo-workflows.readthedocs.io/en/latest/walk-through/steps/

## Issues Found
- The init container wait loop used `kubectl wait --for=condition=complete --timeout=1h` without checking the Job `Failed` condition. If the prerequisite Job failed, the dependent init container could keep waiting instead of failing the dependent Job. Updated the examples to poll `Complete` with a short timeout and exit when the prerequisite reaches `Failed`.
- The Python controller examples used `config.load_kube_config()` even though the post recommends running the controller as a Kubernetes Job. Updated the examples to prefer `config.load_incluster_config()` and fall back to local kubeconfig for workstation use.
- The Python job wait helper checked only `.status.succeeded` and compared `.status.failed` to `.spec.backoffLimit`. Kubernetes exposes terminal Job state through `Complete` and `Failed` conditions, and retry accounting can include container restarts with `restartPolicy: OnFailure`. Updated the helper to check terminal conditions.
- The Bash wait script performed numeric comparisons against possibly empty jsonpath output. Updated it to default empty counters to zero and to use `Complete` and `Failed` Job conditions for success and failure decisions.

## Review Notes
- The PVC example uses `ReadWriteMany`, which is valid Kubernetes syntax, but it requires a storage class or provisioner that supports multi-node read/write access.
- The Argo Workflows steps example is structurally consistent with the official steps template pattern.
