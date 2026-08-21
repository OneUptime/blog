# Validation Summary: Diagnose Flannel Pod IP Exhaustion and Duplicate Node CIDRs

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes Node API, node IPAM, and the in-tree `RangeAllocator`
- Flannel Kubernetes subnet-manager and standalone etcd modes
- Flannel CNI plugin delegation
- CNI `host-local` IPAM and node-local allocation state
- `kubectl`, kubeadm, `crictl`, `jq`, and Linux system administration commands

## Sources Consulted

- [Kubernetes Node v1 API](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Kubernetes kube-controller-manager flags](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [Kubernetes kubeadm implementation details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes `kubectl drain` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/) and [Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes in-tree Node CIDR RangeAllocator source](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/nodeipam/ipam/range_allocator.go)
- [Kubernetes CIDR-set allocation, occupation, and release source](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/nodeipam/ipam/cidrset/cidr_set.go)
- [Kubernetes Node PodCIDR validation source](https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/core/validation/validation.go)
- [Flannel Kubernetes-specific troubleshooting](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md#kubernetes-specific)
- [Flannel configuration](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md), [running and etcd leases](https://github.com/flannel-io/flannel/blob/master/Documentation/running.md), and [upstream Flannel Kubernetes manifest](https://github.com/flannel-io/flannel/blob/master/Documentation/kube-flannel.yml)
- [Flannel Kubernetes subnet-manager source](https://github.com/flannel-io/flannel/blob/master/pkg/subnet/kube/kube.go)
- [Flannel CNI plugin configuration and delegation](https://github.com/flannel-io/cni-plugin/blob/main/README.md) and [implementation](https://github.com/flannel-io/cni-plugin/blob/main/flannel_linux.go)
- [CNI host-local IPAM documentation](https://www.cni.dev/plugins/current/ipam/host-local/)
- [Host-local allocator](https://github.com/containernetworking/plugins/blob/main/plugins/ipam/host-local/backend/allocator/allocator.go), [range defaults](https://github.com/containernetworking/plugins/blob/main/plugins/ipam/host-local/backend/allocator/range.go), and [disk-state format](https://github.com/containernetworking/plugins/blob/main/plugins/ipam/host-local/backend/disk/backend.go)
- [Kubernetes crictl guide](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/) and [cri-tools documentation](https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md)
- [jq manual](https://jqlang.org/manual/dev/) and [GNU Bash redirection reference](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)

## Issues Found

- The initial `POD=<stuck-pod>` assignment was invalid shell syntax because the angle brackets were parsed as redirection operators. It was changed to the syntactically valid placeholder `POD=stuck-pod-name`.
- The introduction treated `.spec.podCIDR` and `.spec.podCIDRs` as alternative single-range fields. It now explains that Kubernetes assigns one CIDR per configured family, stores the first in `.spec.podCIDR`, and stores the one- or two-entry family list in `.spec.podCIDRs`.
- `kubectl logs daemonset/kube-flannel-ds` could select only one arbitrary DaemonSet pod and miss the affected node. `--all-pods=true` was added.
- The `CIDRNotAvailable` description was too broad, and the quoted host-local exhaustion error was legacy-only. The text now gives the in-tree `RangeAllocator` meaning of the event and includes both the current `range set` error and the older `network: cbr0` form. The generic address-conflict branch was also narrowed to avoid implying that duplicate Node CIDRs always produce a specific local CNI error.
- Duplicate-CIDR recovery omitted a critical in-tree allocator behavior: duplicate occupations are not reference-counted, so deleting either duplicate Node can release a prefix still used by the other. The recovery guidance now requires allocator reconciliation and a uniqueness re-audit before Nodes are rebuilt, rejoined, or added. It also states that assigned Node Pod CIDRs are immutable through the Kubernetes API.
- The duplicate audit incorrectly labeled `.spec.podCIDR` as necessarily IPv4, and the per-node command displayed only the primary range. The wording is now family-neutral, containment is checked against the corresponding Flannel network, and the per-node command displays `.spec.podCIDRs`.
- The post referred to a standard Kubernetes installation and an upstream Kubernetes Flannel manifest, even though Kubernetes does not bundle Flannel. These were corrected to a common Flannel-on-Kubernetes installation and the upstream Flannel Kubernetes manifest. The Kubernetes-backed subnet lease wording was also clarified as Node-derived state rather than a `coordination.k8s.io` Lease object.
- The host-local state command always used the default directory even though the prose acknowledged `dataDir` overrides. It now reads the delegated Flannel plugin's `ipam.dataDir` and falls back to `/var/lib/cni/networks`. The nonexistent generic “reserved values” configuration concept was replaced with the documented `rangeStart`, `rangeEnd`, and `gateway` controls.
- Current host-local allocation files contain the full CNI container ID followed by the interface name, while older files can contain only the ID. The explanation was corrected, `crictl pods` and `crictl ps` now use `--no-trunc`, and the post now requires `crictl` to target the same CRI endpoint as kubelet before an allocation is declared orphaned.

## Review Notes

- All Bash code blocks pass syntax checking after the fixes, and the jq duplicate-grouping and host-local default-directory expressions were exercised locally.
- The names and paths shown match the current upstream Flannel manifest. Customized packaging can use a different namespace, DaemonSet name, conflist path, or CRI endpoint.
- `find -printf`, `sort -V`, and `cp -a` assume GNU-style userland, while `systemctl` assumes a systemd-managed kubelet. Those assumptions are reasonable for typical kubeadm Linux nodes but are not universal.
- The jq audit detects exact duplicate primary CIDRs; as the post notes, dual-stack ranges must be audited per family. Differently sized overlapping ranges require an overlap-aware check rather than exact string grouping.
