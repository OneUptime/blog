# Validation Summary: How to Shut Down Talos Linux Nodes Gracefully

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- etcd
- PodDisruptionBudgets
- PersistentVolumes

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux control plane documentation: https://www.talos.dev/v1.5/learn-more/control-plane/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes node status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes node shutdown documentation: https://kubernetes.io/docs/concepts/cluster-administration/node-shutdown
- Kubernetes pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
- The basic shutdown description implied `talosctl shutdown` only stops services and powers off the machine. Updated it to mention that current Talos shutdown cordons and drains by default, while still recommending pre-checks for workload and quorum impact.
- The forced shutdown section implied pods are simply rescheduled after a node failure. Updated it to clarify that controller-managed workloads can be replaced, while standalone pods and some stateful workloads may require manual attention.
- The persistent storage check used `kubectl get pv -o wide | grep <node-name>`, which does not reliably show local PV node affinity. Replaced it with a JSONPath command that lists PVs with node affinity and filters for the target node.
- The shutdown use-case list described permanent decommissioning as a shutdown case. Updated it to say the node is taken offline before a separate decommissioning or reset process, because Talos scale-down/removal requires additional steps.
- The automation script counted `talosctl etcd members` output with `wc -l`, which includes the table header. Updated it to count member rows only.
- The automation script detected control plane nodes by reading the value of `node-role.kubernetes.io/control-plane`, but that label is commonly present with an empty value. Updated the check to test for the label key in `kubectl get node --show-labels`.
- The automation script used unquoted shell variables in several commands. Quoted the node IP and node name variables to avoid word-splitting issues.

## Review Notes
- `kubectl drain --delete-emptydir-data` is current; the older `--delete-local-data` flag is deprecated and was not used.
- The guide's quorum examples for three-node and five-node etcd clusters are consistent with etcd majority quorum behavior.
- For decommissioning rather than temporary shutdown, Talos' scale-down flow also includes `talosctl reset` and deleting the Kubernetes Node object.
