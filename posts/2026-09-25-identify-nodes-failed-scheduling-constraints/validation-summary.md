# Validation Summary: How to Identify Which Nodes Failed Each Constraint in a FailedScheduling Event

## Status
validated

## Post Type
Technical troubleshooting guide with Bash commands and jq examples.

## Technologies Covered
- Kubernetes scheduler, scheduling events, filter plugins, and scheduler profiles
- kubectl and Kubernetes API object snapshots
- Node selectors, node and pod affinity, taints, and tolerations
- Resource requests, allocatable resources, and topology spread
- PersistentVolumes, PersistentVolumeClaims, StorageClasses, and CSI
- kube-scheduler-simulator
- Bash, jq, and JSON

## Sources Consulted
- Kubernetes scheduler overview: https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
- Scheduling framework, including filter short-circuit behavior: https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/
- Node assignment, affinity semantics, and profile addedAffinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- StorageClasses and volume binding: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Admission controllers: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- Kubernetes scheduler framework source: https://raw.githubusercontent.com/kubernetes/kubernetes/master/pkg/scheduler/framework/types.go
- Official SIG Scheduling simulator repository and annotation example: https://github.com/kubernetes-sigs/kube-scheduler-simulator
- Amazon EKS control-plane logging: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- jq manual: https://jqlang.org/manual/
- Local CLI help: kubectl get --help, kubectl describe --help, and kubectl options.

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. The post is technically relevant and contains executable examples.
- All four Bash code blocks passed bash -n syntax checks. The kubectl resource names, JSON output option, namespace option, all-namespaces option, and context selection were checked against official references and local CLI help.
- Executed the exact selector expression against synthetic JSON with matching labels, mismatched labels, missing labels, multiple selector entries, an empty selector, and an absent selector. Results matched the expected node names and failed keys.
- Executed the taint expression with multiple taints, a missing taint value, and nodes without taints. Node associations and output formatting were correct.
- Executed the simulator annotation extraction pipeline against a representative JSON-encoded annotation. The annotation key matches the official simulator example, and the final jq invocation correctly parses its JSON string.
- Confirmed hard filtering precedes scoring, selector and required affinity requirements combine, terms are alternatives, and untolerated NoSchedule and NoExecute taints block normal placement. PreferNoSchedule remains a preference.
- Resource requests rather than live usage determine ordinary resource fit. Effective requests must follow the incident cluster's behavior, including applicable init-container, sidecar, overhead, and pod-level resource rules; the article appropriately avoids supplying a simplistic calculation.
- Scheduler filtering can stop at the first failing plugin for a node. An aggregate event or default log stream therefore cannot be treated as an exhaustive matrix of every possible failure.
- Confirmed scheduler profiles can add affinity absent from the pod manifest. Pod affinity, topology spread, and storage decisions require additional cluster objects, as described.
- The linked technical resources resolve to the intended official documentation or project. No specific Kubernetes release or deprecated API is prescribed by the examples.
- Validation used documentation, local CLI help, Bash syntax checks, and synthetic JSON execution. No live cluster investigation or simulator deployment was performed. Running the examples requires suitable API permissions and, for the simulator command, the separately configured context and test pod described in the post.
- Sequential exports and simulation cannot establish the exact historical scheduler cache state. The post correctly distinguishes reconstruction from observed evidence and warns about simulator configuration and storage differences.
