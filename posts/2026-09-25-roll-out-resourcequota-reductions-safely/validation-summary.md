# Validation Summary: How to Roll Out ResourceQuota Changes Safely When Existing Workloads Already Exceed the New Limit

## Status

validated

## Post Type

Technical operational guide with Kubernetes CLI examples.

## Technologies Covered

- Kubernetes ResourceQuota, quota admission, and PriorityClass scopes
- Pods, Deployments, ReplicaSets, StatefulSets, and Jobs
- Horizontal Pod Autoscaler (HPA)
- PersistentVolumeClaims (PVCs)
- kubectl, Bash, API dry-run, and declarative configuration management

## Sources Consulted

- [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/) — existing-resource behavior, request accounting, overlapping quotas, and PriorityClass scopes.
- [ResourceQuota API](https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/) — desired limits and observed quota status. The post's policy-resources URL redirects to this reference.
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — template-triggered rollouts, surge, termination overlap, and quota-related FailedCreate conditions.
- [Kubernetes API Concepts: Dry-run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run) — validation and admission without persistence.
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — multiple resource types, namespace selection, and YAML/JSON output.
- [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/) — describing all resources of a selected type.
- [kubectl diff](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/) — file input and exit-status conventions.
- [kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/) — file input and server dry-run flag.
- [kubectl reference](https://kubernetes.io/docs/reference/kubectl/#resource-types) — resource names and short names.
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) — replica ownership and interaction with manual scaling.
- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) — expansion recovery versus unsupported shrinking below current capacity.
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — CPU and memory quantities and scheduling based on requests.
- [Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/) — mutation before validation, quota enforcement, and accounting reconciliation.
- [Author profile](https://github.com/nawazdhandala) — verified the linked author destination.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. All external links resolve to the intended resources, including redirects for the ResourceQuota API reference and author profile.
- Lowering a quota does not evict existing Pods or reduce their requests. An over-budget namespace can therefore retain running workloads while subsequent creations fail. Scoped and general quotas must both permit a matching request.
- The distinction between spec.hard, status.hard, and status.used is correct. Waiting for accounting and checking replacement capacity are appropriate; deleting a Pod does not guarantee immediate quota headroom.
- The Deployment rollout, HPA ownership, termination overlap, and injected-sidecar guidance is consistent with the documented behavior. Quota capacity does not guarantee schedulable node capacity.
- CPU millicores, decimal memory units, and binary memory units require distinct conversions. The PVC guidance correctly avoids promising that reducing a storage request shrinks an existing volume.
- Verified all six kubectl commands against official references. Both Bash code blocks passed bash -n syntax checks. kubectl diff returns 0 for no differences, 1 for differences, and greater than 1 for errors. Server dry-run checks the submitted request without exercising future workload transitions.
- No cluster operations were executed. The payments namespace and quota-next.yaml are operator-provided inputs; no concrete quota manifest is included to validate. Rollout, autoscaling, replacement, and maintenance rehearsals still require a representative cluster.
- The post specifies no Kubernetes version and uses no deprecated commands or explicit deprecated API versions. GitOps rollback details depend on the configuration owner; using that owner to restore the approved policy is appropriate operational guidance.
