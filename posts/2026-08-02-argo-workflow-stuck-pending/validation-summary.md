# Validation Summary: Argo Workflow Is Stuck in Pending: A Scheduling, Quota, and RBAC Checklist

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Argo Workflows
- Kubernetes Pods and scheduling
- Argo Workflow controller configuration, parallelism, synchronization, and instance IDs
- Kubernetes ResourceQuota and LimitRange admission
- Kubernetes node selectors, affinity, taints, tolerations, topology spread constraints, and scheduling gates
- PersistentVolumeClaims, StorageClasses, and CSI provisioning
- Kubernetes RBAC, ServiceAccounts, and `kubectl auth can-i`
- `kubectl`, Argo CLI, jq, Bash, and Zsh

## Sources Consulted

- [Argo Workflows: Limiting parallelism](https://argo-workflows.readthedocs.io/en/latest/parallelism/)
- [Argo Workflows: Synchronization](https://argo-workflows.readthedocs.io/en/latest/synchronization/)
- [Argo Workflows: Workflow Controller ConfigMap](https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/)
- [Argo Workflows: Scaling and instance IDs](https://argo-workflows.readthedocs.io/en/latest/scaling/)
- [Argo Workflows: Managed Namespace](https://argo-workflows.readthedocs.io/en/latest/managed-namespace/)
- [Argo Workflows: Service accounts](https://argo-workflows.readthedocs.io/en/latest/service-accounts/)
- [Argo Workflows: Workflow RBAC](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Argo Workflows: Field reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: `argo get` CLI reference](https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/)
- [Argo Workflows: Official controller ClusterRole manifest](https://github.com/argoproj/argo-workflows/blob/main/manifests/cluster-install-no-crds/workflow-controller-rbac/workflow-controller-clusterrole.yaml)
- [Argo Workflows: Official minimal Workflow CRD](https://github.com/argoproj/argo-workflows/blob/main/manifests/base/crds/minimal/argoproj.io_workflows.yaml)
- [Kubernetes: Pod lifecycle and Pod conditions](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes: Taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes: Pod scheduling readiness](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-scheduling-readiness/)
- [Kubernetes: Pod topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes: Resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Limit ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes: Persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Storage classes and `WaitForFirstConsumer`](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Admission controllers](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes: ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes: Configure ServiceAccounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- [Kubernetes: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found

- The literal shell placeholders `WF=<workflow-name>` and `<claim-name>` are parsed as redirections and make the snippets syntactically invalid if copied. Replaced them with valid placeholder values, `your-workflow-name` and `your-claim-name`.
- The controller RBAC example checked `workflows/status.argoproj.io`. The current Argo Workflow CRD does not expose a `status` subresource, and the official controller ClusterRole grants `patch` on `workflows`. Changed the check to `kubectl auth can-i patch workflows.argoproj.io`.
- The controller ServiceAccount lookup did not account for Kubernetes defaulting an omitted Pod `serviceAccountName` to `default`. Added the same fallback used later for Workflow Pods.
- Missing Secrets, ConfigMaps, and PVCs were listed as typical API-time Pod creation rejections. Kubernetes normally persists the Pod and reports the missing Secret/ConfigMap during kubelet startup or the missing PVC during scheduling. Kept a nonexistent ServiceAccount in the rejection list and moved the other cases to the correct post-creation boundary.
- The resource-request command only printed regular containers even though the text instructed readers to include init containers and sidecars. Expanded it to show Pod-level resources, runtime overhead, init containers (including native sidecars), and regular containers so the scheduling review includes all relevant request sources.
- The Workflow ServiceAccount explanation treated Workflow-level `spec.serviceAccountName` as the only non-default source. Current Argo templates can override `serviceAccountName`, and Workflow/template `executor.serviceAccountName` can give the executor a separate identity. Added both override caveats so the RBAC checks use the effective identity for the pending node.
- `kubectl logs deployment/workflow-controller` reads only one selected Pod by default, which can miss the reconciling controller in an HA deployment. Added the current `--all-pods=true` flag to controller log checks and the evidence bundle.

## Review Notes

- The examples assume the common controller namespace, Deployment, and ConfigMap names (`argo`, `workflow-controller`, and `workflow-controller-configmap`). Installations that customize those names must substitute their actual values, as the post already notes for labels and namespaces.
- Pod-level `spec.resources` is a beta Kubernetes feature enabled by default from Kubernetes 1.34; the JSONPath inspection remains safe when the field is absent. Argo's corresponding `podResources` fields require the cluster feature gate.
- The Bash/Zsh blocks were syntax-checked after correction. The jq node-status and container-waiting filters were exercised with representative JSON, and kubectl flags were checked against the installed v1.34.1 client help and current official CLI reference.
