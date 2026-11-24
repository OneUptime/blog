# Technical validation

The guide coordinates low-demand replica capacity with a separate eviction floor. API admission and arithmetic checks are distinguished from live autoscaling and application availability.

## Checks performed

- Reviewed tagged1.34.0 HPA scale updates, ReplicaSet direct deletion, disruption allowance calculation, HPA v2 fields, metrics prerequisites, stabilization and replica-field ownership
- Executed exact article server dry-run apply with kubectl1.34.0 against isolated API server1.34.0: HPA and PDB accepted without persistence; invalid maxReplicas3/minReplicas4 rejected
- With an existing minAvailable3 PDB, an API scale dry-run to2 was accepted and persisted Deployment replicas remained4; this verifies no API-level PDB interlock, not live autoscaler behavior
- Both YAML objects passed tagged1.34.0 OpenAPI schemas; checked four table rows, all nine configured healthy replica counts and50 planning boundary cases
- Two shell blocks passed syntax; seven-node/six-edge Mermaid structurally checked; generated1280x720 social image visually inspected without clipping

## Sources checked

- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/controller/podautoscaler/horizontal.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/controller/replicaset/replica_set.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/controller/controller_utils.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/controller/disruption/disruption.go
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-resource-metrics
- https://github.com/kubernetes/api/blob/v0.34.0/autoscaling/v2/types.go
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#stabilization-window
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#implicit-maintenance-mode-deactivation
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#migrating-deployments-and-statefulsets-to-horizontal-autoscaling
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/api/openapi-spec/swagger.json
- https://book.kubebuilder.io/reference/envtest.html

## Limitations

- Local controller-runtime0.22.1/Go1.25.0 API fixture ran no HPA, ReplicaSet, disruption controller, metrics server, scheduler or kubelet
- No live CPU load, autoscaling reconciliation, node drain, application availability or replacement recovery tested; performance and replica numbers remain illustrative
- Read-only diagnostic commands source-reviewed rather than run against a production cluster; Mermaid not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
