# Validation Summary: Upgrade Flannel Without Leaving Stale Routes

## Status

validated

## Post Type

Operational upgrade and troubleshooting guide

## Technologies Covered

- Kubernetes DaemonSets, ControllerRevisions, PodDisruptionBudgets, Node objects, cordon, drain, and `kubectl`
- Flannel v0.28.9 and the Flannel CNI plugin v1.9.1-flannel3
- Flannel Kubernetes and etcd subnet managers
- VXLAN, `host-gw`, WireGuard, Linux routes, neighbor tables, and forwarding databases
- CNI host binaries, conflists, Pod networking, MTU, ClusterIP routing, and source NAT

## Sources Consulted

- [Flannel v0.28.9 release notes](https://github.com/flannel-io/flannel/releases/tag/v0.28.9)
- [Flannel v0.28.9 release manifest](https://github.com/flannel-io/flannel/releases/download/v0.28.9/kube-flannel.yml)
- [Flannel v0.28.9 Kubernetes manifest source](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml)
- [Flannel running and restart guidance](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/running.md#zero-downtime-restarts)
- [Flannel configuration and subnet-manager documentation](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md)
- [Flannel backend reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md)
- [Flannel VXLAN design and device naming](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/vxlan.go)
- [Flannel VXLAN permanent neighbor and FDB implementation](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/device.go)
- [Flannel VXLAN lease add/remove handling](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/vxlan_network.go)
- [Flannel Kubernetes subnet-manager implementation](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/subnet/kube/kube.go)
- [Flannel CNI plugin v1.9.1-flannel3 release](https://github.com/flannel-io/cni-plugin/releases/tag/v1.9.1-flannel3)
- [Kubernetes DaemonSet rolling-update documentation](https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/)
- [Kubernetes DaemonSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/daemon-set-v1/)
- [Kubernetes DaemonSet rollback documentation](https://kubernetes.io/docs/tasks/manage-daemon/rollback-daemon-set/)
- [Kubernetes safe node-drain documentation](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes `kubectl drain` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)
- [Kubernetes `kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes Node API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Kubernetes field-selector documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)

## Issues Found

- The route-ownership discussion implicitly treated Kubernetes Node Pod CIDRs and Flannel annotations as authoritative for every Flannel deployment. That is correct for the upstream `--kube-subnet-mgr` manifest, but not for etcd-backed Flannel. The introduction now states the guide's subnet-manager assumption and directs etcd-backed operators to the current leases in etcd.
- The replacement workflow waited for the Pod's `Ready` condition without explaining that the v0.28.9 release asset has no readiness probe. In that manifest, `Ready` can indicate only that the container started, not that Flannel's network state is ready. The post now makes the host-state and traffic checks authoritative unless the reviewed target manifest defines the `/readyz` probe.
- The stale-route definition could imply that a default VXLAN route contains the peer's public underlay address. The post now distinguishes a direct route's next hop from VXLAN, where the underlay peer address is stored in the matching FDB entry.
- The test procedure allowed briefly uncordoning the node before validation completed. Uncordoning permits all eligible workloads to schedule, not only the test Pod. The post now keeps the node cordoned and uses explicit `spec.nodeName` binding or another narrowly scoped method for the test.

## Review Notes

- As of 2026-08-21, the latest Flannel release is v0.28.9 and its release manifest uses `ghcr.io/flannel-io/flannel:v0.28.9` with `ghcr.io/flannel-io/flannel-cni-plugin:v1.9.1-flannel3`. The manifest names, labels, init-container names, and host paths used by the commands were verified.
- The generated v0.28.9 release asset differs from the tagged `Documentation/kube-flannel.yml`: the release asset omits the health probes and uses a direct `cp` for the CNI conflist. The post's instruction to inspect the pinned target manifest is therefore important.
- `kubectl wait --for=create` is current but was added in kubectl 1.31. Older kubectl clients need a separate polling step before waiting for `Ready`.
- The post's `master`-branch documentation and implementation links are valid at review time but can drift; the review above used v0.28.9-pinned sources where available.
