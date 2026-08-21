# Validation Summary: How to Pin vCluster Workloads to Dedicated Host Nodes

## Status

validated

## Post Type

Technical guide / Kubernetes scheduling and multi-tenancy tutorial

## Technologies Covered

- vCluster 0.36 with a containerized control plane and Shared/Dedicated Nodes
- Kubernetes node scheduling, node selectors, and direct node assignment
- Kubernetes taints and tolerations
- Kubernetes admission control and RBAC
- `kubectl` and the vCluster CLI
- Kubernetes node draining, PodDisruptionBudgets, and node-pool autoscaling

## Sources Consulted

- [vCluster 0.36 architecture](https://www.vcluster.com/docs/vcluster/introduction/architecture/)
- [vCluster deployment with isolated workloads](https://www.vcluster.com/docs/vcluster/deploy/worker-nodes/host-nodes/isolated-workloads)
- [vCluster shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [vCluster node synchronization configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/nodes)
- [vCluster Pod synchronization configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/core/pods)
- [vCluster control-plane StatefulSet scheduling configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/deployment/statefulset)
- [vCluster 0.36 `create` CLI reference](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster v0.36.1 chart schema](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/values.schema.json), [configuration types](https://github.com/loft-sh/vcluster/blob/v0.36.1/config/config.go), [toleration parser](https://github.com/loft-sh/vcluster/blob/v0.36.1/pkg/util/toleration/toleration.go), and [Pod selector enforcement](https://github.com/loft-sh/vcluster/blob/v0.36.1/pkg/controllers/resources/pods/syncer.go)
- [Kubernetes: Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes: Taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes `kubectl label` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/) and [`kubectl taint` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/)
- [Kubernetes: Safely drain a node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/) and [Disruptions / PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)

## Issues Found

- The architecture description treated Dedicated Nodes as separate from Shared Nodes. It now identifies Dedicated Nodes as a configuration within the Shared Nodes architecture, which is why tenant workloads still use the control plane cluster's CNI and CSI.
- The placement guarantee did not account for direct node assignment. Kubernetes `spec.nodeName` and Pod binding requests bypass the scheduler, including `nodeSelector` and `NoSchedule` evaluation; vCluster 0.36 applies the configured selector only when the translated Pod has no `nodeName`. The guide now scopes itself to the default host scheduler, requires rejection of tenant-authored direct assignment, adds a host-side admission check for translated Pods created with `spec.nodeName`, and includes a negative test for that control.
- The vCluster upgrade command did not identify the host kubeconfig context even though the surrounding `kubectl` commands use explicit contexts. It now includes `--context host` so it cannot accidentally target whichever context happens to be current.
- The first negative test removed capacity after `placement-check` had already been scheduled, then expected that Pod to be Pending. Node selectors are not re-evaluated to move an already bound Pod, and a `NoSchedule` taint does not evict one. The test now creates a fresh Pod, or deletes and recreates `placement-check`, after capacity is removed and checks that replacement for spillover.
- The node-pool audit warning said that a mistakenly labeled infrastructure node automatically became eligible. A matching label makes the node satisfy the enforced selector, but other taints and scheduling constraints can still exclude it. The warning now states that distinction.

## Review Notes

- The vCluster YAML fields and types were checked against the official v0.36.0 and v0.36.1 chart schemas and source. `enforceTolerations` is correctly a string array, and `platform.example.com/tenant-pool=team-a:NoSchedule` parses to an `Equal` toleration with the stated key, value, and effect.
- The selector merge behavior is version-correct: for host-scheduled Pods without `spec.nodeName`, vCluster overwrites a conflicting tenant value for the enforced key. `clearImageStatus`, the control-plane scheduling path, and the statement that ordinary `kubectl logs` and `exec` do not depend on kubelet proxying are also correct.
- All referenced documentation URLs were reachable and pointed to the intended official vCluster 0.36 or Kubernetes resources. The `kubectl` commands, Pod manifest, and vCluster CLI flags are valid.
- A vCluster 0.36 CLI defaults to its matching 0.36 chart. When applying this guide with a later CLI, operators should pin the desired 0.36 patch with `--chart-version` if exact version reproducibility is required.
- The example node label is syntactically valid but is not protected from mutation by a compromised kubelet. Environments treating node labels as a security-sensitive isolation signal should enable the Node authorizer and `NodeRestriction` admission plugin and use a protected `node-restriction.kubernetes.io` label prefix. The post correctly avoids presenting its selector as a hard security boundary.
