# Validation Summary: How to Make Cluster Autoscaler React to Affinity and Topology Blockers

## Status
validated

## Post Type
Technical troubleshooting guide with diagnostic commands and AWS node-template tag examples.

## Technologies Covered
- Kubernetes scheduling, node affinity, Pod anti-affinity, and topology spread constraints
- Cluster Autoscaler and node-group expansion simulation
- AWS Auto Scaling groups and EKS managed node groups
- Google Kubernetes Engine autoscaler diagnostics
- kubectl, Bash, and jq
- Kubernetes resource requests, taints, tolerations, and CSI volume topology

## Sources Consulted
- [Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md): expansion simulation, required versus preferred node affinity, group metadata, scale-from-zero support, and status diagnostics.
- [Cluster Autoscaler AWS provider README](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md): discovery, label and taint template tags, and EKS DescribeNodegroup metadata.
- [GKE scale-up troubleshooting](https://cloud.google.com/kubernetes-engine/docs/troubleshooting/cluster-autoscaler-scale-up): rejected groups, NodeAffinity predicate failures, and cloud provisioning failures. The linked URL redirects to the corresponding docs.cloud.google.com page.
- [Kubernetes Pod topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/): eligible domains, selectors, hard skew constraints, minDomains, and domains without existing nodes.
- [Kubernetes assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/): required and preferred affinity, hostname separation, and topology keys.
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/): hard scheduling effects and matching tolerations.
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/): resource requests and optional Pod-level resource fields.
- [Kubernetes reserving compute resources](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/): node allocatable and system reservations.
- [Kubernetes storage classes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode): storage topology and scheduling-aware volume binding.
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), and [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/): resource arguments, namespaces, output formats, selectors, label columns, and relative log durations. Also checked local kubectl help and inherited options.
- [Official jq manual](https://jqlang.org/manual/): field selection, pipes, object shorthand, and absent-field behavior.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post correctly distinguishes unsatisfiable placement constraints from failures after an expansion decision and does not promise that raising group limits resolves placement mismatches.
- The AWS examples correctly represent tag keys and values, rather than shell commands. Template metadata must match the nodes actually provisioned; discovery remains a separate requirement. Managed node-group metadata can also come from provider APIs.
- The hostname-versus-zone explanation and warning about empty topology domains are accurate. minDomains affects skew calculations; it does not independently provision a missing zone. If implementing required zone Pod anti-affinity, also check whether the cluster enables LimitPodHardAntiAffinityTopology, which restricts required anti-affinity topology keys to hostname.
- All three Bash blocks passed bash -n. The exact jq filter was executed against synthetic Pod JSON and correctly returned null for absent optional fields. The top-level spec.resources field is valid where Pod-level resources are supported; its absence does not break the command.
- Local kubectl help and kubectl options confirmed the flags used. Namespaces, Pod names, deployment names, and selectors are illustrative and must match the target installation, as the post indicates.
- Technical reference links resolved to the intended official resources. The post does not pin a Kubernetes or autoscaler version, and the upstream master documentation can change. Its advice to consult the deployed release and provider documentation is appropriate.
- Node allocatable already accounts for configured system reservations; comparisons should also account for requests from DaemonSets and other system Pods without subtracting reservations twice.
- Validation covered documentation, command syntax, and local JSON processing. No live Kubernetes cluster, cloud scale-up, node bootstrap, or scale-from-zero experiment was performed. Those environment-specific checks remain the staging validation procedure described in the post.
