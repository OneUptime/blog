# Validation Summary: How to Diagnose Overlapping Deployment Updates and Active ReplicaSets

## Status
validated

## Post Type
Technical troubleshooting guide with Bash commands and jq filters.

## Technologies Covered
- Kubernetes Deployments, ReplicaSets, Pods, and rolling updates
- kubectl
- Kubernetes ownership metadata, managed fields, Events, and audit logs
- Horizontal Pod Autoscaling and proportional scaling
- Bash and jq

## Sources Consulted
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ — rollover, proportional scaling, availability constraints, pause/resume, and retained rollout history.
- Kubernetes ReplicaSets: https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/ — controller ownership and Deployment-managed ReplicaSets.
- Kubernetes Deployment controller source: https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/deployment/util/deployment_util.go — template matching while ignoring pod-template-hash, retained ReplicaSet selection, and revision annotations.
- Kubernetes API concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/ — API reads and resource versions.
- Kubernetes Server-Side Apply: https://kubernetes.io/docs/reference/using-api/server-side-apply/ — managedFields and field ownership.
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/ — API request audit records.
- Kubernetes Pod debugging: https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/ — investigating scheduling and container startup problems.
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/ — JSON output, namespace selection, sorting, and managed-fields visibility.
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/ — latest-revision tracking, revision pinning, and timeout behavior.
- jq manual: https://jqlang.org/manual/ — any, optional iteration, variables, index, --slurpfile, default values, and TSV output.
- Installed CLI help: kubectl get --help, kubectl rollout history --help, and kubectl describe --help.

## Issues Found
- The initial Deployment snapshot omitted managedFields because kubectl hides that field by default in JSON output. This prevented the snapshot from supporting the later field-manager inspection. Added --show-managed-fields=true to the Deployment retrieval command, as documented by kubectl. No other technical corrections were necessary.

## Review Notes
- All five Bash code blocks passed bash -n syntax checks.
- Executed the jq examples using jq 1.6 and synthetic Deployment, ReplicaSet, and Pod JSON. Verified UID extraction, controller-owner filtering, TSV columns and missing-value defaults, Deployment status projection, and the Pod-to-ReplicaSet UID join. Foreign owners, non-controller references, ownerless objects, and an empty owned-ReplicaSet list were handled correctly.
- Confirmed that template comparison must account for the generated hash label and that creation time alone cannot identify the intended rollout target.
- Confirmed proportional scaling during an in-progress or paused rolling update and rollout status revision/timeout semantics.
- The linked Kubernetes documentation resolves to the intended resources. The post does not depend on a specific Kubernetes release or use deprecated command forms.
- Live cluster commands and an actual overlapping rollout were not executed. Validation used official documentation, upstream controller source, local CLI help, and isolated JSON fixtures.
- Separate API reads remain non-transactional. Resource versions are useful for detecting changes; they should not be treated as a universal timestamp for ordering writes across resources.
