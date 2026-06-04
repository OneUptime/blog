# Validation Summary: How to Migrate from Flannel CNI to Cilium Without Cluster Downtime

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- Flannel CNI
- Cilium CNI
- CiliumNetworkPolicy
- Helm
- kubectl
- AWS EKS managed node groups
- Hubble

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes host-scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium IPAM overview: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium routing and VXLAN encapsulation documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium node taints and unmanaged pods documentation: https://docs.cilium.io/en/stable/installation/taints/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium DNS/FQDN policy documentation: https://docs.cilium.io/en/stable/security/dns/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- AWS CLI EKS create-nodegroup reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- Amazon EKS managed node group taints documentation: https://docs.aws.amazon.com/eks/latest/userguide/node-taints-managed-node-groups.html
- Flannel Kubernetes deployment documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md

## Issues Found
- The migration overview implied that running two CNIs temporarily is generally safe. Clarified that this means separate node pools and that cross-CNI connectivity depends on compatible PodCIDR allocation, routing, encapsulation, and firewall rules.
- The pre-migration test pod attempted to run `kubectl` inside the netshoot pod. Moved the sample pod IP lookup outside the pod and passed it as an environment variable.
- The EKS node group taint used Kubernetes-style `NoSchedule`, but AWS CLI/API taint effects require uppercase enum values. Replaced it with the Cilium startup taint using `NO_EXECUTE`.
- The node labeling sequence overwrote the new nodes' `cni=cilium` label. Moved Flannel labeling before node group creation and relabeled the new EKS node group after it becomes active.
- The Flannel DaemonSet would have scheduled onto the new nodes and installed Flannel CNI configuration. Added a patch to constrain Flannel to `cni=flannel` nodes before creating the Cilium node group.
- The Cilium install example pinned old Cilium `1.14.5` and used older Helm values. Updated it to Cilium `1.19.4` and current `routingMode=tunnel` / `tunnelProtocol=vxlan` values.
- The Cilium IPAM configuration used cluster-pool IPAM with the existing cluster CIDR, which can overlap with Flannel allocations during a mixed migration. Switched to Kubernetes host-scope IPAM so Cilium uses each node's Kubernetes-assigned PodCIDR.
- The verification commands ran Cilium CLI operations inside the Cilium DaemonSet. Replaced them with workstation Cilium CLI commands (`cilium status --wait`, `cilium connectivity test`) and Hubble CLI usage.
- The workload health check used `kubectl top` to detect pod errors, but metrics output does not report CrashLoop or pod phase failures. Replaced it with a `kubectl get pods -o json` / `jq` phase check.
- The FQDN CiliumNetworkPolicy did not allow DNS traffic to kube-dns, so the `toFQDNs` rule could fail to learn allowed IPs. Added a kube-dns DNS proxy allow rule following Cilium's DNS policy examples.
- The cleanup command used `kubectl debug` against remaining nodes and removed `/etc/cni` from the debug container filesystem instead of the host. Changed it to a commented host cleanup command using `chroot /host` for reused nodes.
- The kube-proxy replacement example used `kubeProxyReplacement=strict`, which is not valid in current Cilium Helm values. Updated it to `kubeProxyReplacement=true`.

## Review Notes
Cilium CLI and Hubble CLI commands assume those CLIs are installed on the operator workstation and configured for the cluster. The post remains an example migration flow; a real production migration still needs environment-specific validation for PodCIDRs, route tables, security groups/firewalls, kube-proxy mode, PodDisruptionBudgets, and application-level health checks.
