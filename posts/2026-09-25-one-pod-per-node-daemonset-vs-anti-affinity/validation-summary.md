# Validation Summary: How to Schedule One Pod on Every Eligible Node: DaemonSet vs Anti-Affinity

## Status
validated

## Post Type
Technical guide with a Kubernetes manifest and command-line examples.

## Technologies Covered
- Kubernetes DaemonSets and Deployments (`apps/v1`)
- Node selectors, pod anti-affinity, and topology spread constraints
- Taints, tolerations, scheduling, and resource requests
- DaemonSet rolling updates and readiness
- kubectl, YAML, jq, and shell commands
- BusyBox 1.37

## Sources Consulted
- [Kubernetes DaemonSets](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) — node coverage, node selection, controller-generated affinity, automatic tolerations, and changes to node labels.
- [DaemonSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/) — manifest fields, status counters, and rolling update settings.
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — desired replicas and autoscaling.
- [Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/) — node selectors and required pod anti-affinity.
- [Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/) — balancing replicas across topology domains.
- [Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) — matching rules and scheduling effects.
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — CPU and memory units and resource requests.
- [kubectl label](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/) and [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — command syntax and output/filter flags. Also consulted local `kubectl describe --help` and `kubectl get --help`.
- [Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/) — support for the Event `reason` field.
- [jq manual](https://jqlang.org/manual/) — array iteration, object construction, and field access.
- [BusyBox manual](https://busybox.net/downloads/BusyBox.html) — shell, date, and sleep utilities.
- [Docker Official Images BusyBox metadata](https://raw.githubusercontent.com/docker-library/official-images/master/library/busybox) — confirms the `1.37` image tag.
- [Author profile](https://github.com/nawazdhandala) — verified the linked GitHub profile and redirect.

## Issues Found
No technical issues found.

## Review Notes
- The post correctly distinguishes node coverage from a fixed desired replica count and from host separation. The three-replica scenario assumes required hostname anti-affinity matches the application replicas and remaining nodes otherwise satisfy scheduling constraints.
- The DaemonSet manifest uses the supported `apps/v1` API. Its selector matches the template labels, its node-selector values are strings, and its resource requests and memory limit are valid. Omitting `replicas` is correct.
- Automatic DaemonSet tolerations do not provide blanket access to arbitrarily tainted pools. The distinction between intended node scope and tolerations is accurate.
- The scheduling explanation correctly separates controller intent from readiness. Host-port conflicts and resource shortages can block placement.
- `RollingUpdate` with `maxUnavailable: 1` is valid. The default `maxSurge` is zero; enabling surge can allow overlapping old and new pods on a node. The post correctly calls out potential gaps and duplicate-agent concerns.
- Parsed the YAML with PyYAML and checked selector agreement and string typing. All Bash blocks and the container shell command passed shell syntax checks. Executed the jq expression against a representative NodeList fixture successfully.
- Recalculated the capacity example: 100 × 100Mi = 10,000Mi = 9.765625Gi, correctly rounded to about 9.8Gi.
- The BusyBox `1.37` tag exists. It is a mutable version tag rather than an immutable digest; this does not invalidate the demonstration.
- Namespaced diagnostic commands use the current namespace. The node-label command assumes the named nodes exist and the label is absent or already has the requested value; changing an existing different value requires `--overwrite`.
- The heartbeat example intentionally has no readiness probe. A production agent should use health checks appropriate to its function when interpreting ready coverage.
- Verified the post's external links resolve to the intended resources. No deprecated API or flag was identified in the examples.
- Validation consisted of documentation review and local static/fixture checks. No live-cluster deployment, image execution, node addition/removal, or rollout measurement was performed. README.md was left unchanged.
