# Validation Summary: How to Validate CNI Configuration Files for IPv4 in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Container Network Interface (CNI)
- Flannel
- Calico
- `kubectl`
- `calicoctl`
- Linux network namespaces

## Sources Consulted
- Kubernetes Documentation: Network Plugins — https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes Documentation: Troubleshooting CNI plugin-related errors — https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/troubleshooting-cni-plugin-related-errors/
- Kubernetes Documentation: kubectl Reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- CNI Specification (`SPEC.md`) — https://github.com/containernetworking/cni/blob/main/SPEC.md
- CNI Project README — https://github.com/containernetworking/cni
- CNI Reference Plugins — https://github.com/containernetworking/plugins
- Flannel README — https://github.com/flannel-io/flannel
- Flannel CNI Plugin README — https://github.com/flannel-io/cni-plugin
- Upstream Flannel manifest (`kube-flannel.yml`) — https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
- Calico Documentation: IP pool — https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Documentation: calicoctl ipam show — https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Documentation: Configure IP pools — https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-ip-pools

## Issues Found

1. **Flannel backing-store description was too narrow.** The post said Flannel stores node subnet assignments in etcd, but current upstream Flannel supports either the Kubernetes API or etcd as its backing store. Updated the wording to reflect both supported modes.

2. **The `FLANNEL_SUBNET` example value was inaccurate.** The sample output used `10.244.1.0/24`, while Flannel’s documented `subnet.env` examples use a host address within the subnet such as `10.244.1.1/24`. Updated the example accordingly.

3. **The manual CNI test omitted the `DEL` lifecycle step.** Deleting only the network namespace can leave behind CNI/IPAM state, especially with `host-local` IPAM. Added a matching `CNI_COMMAND=DEL` invocation before removing the namespace, in line with the CNI spec.

4. **The manual bridge test reused `cni0`, which can conflict with a live cluster bridge.** Replaced it with a dedicated test bridge name so the example is safer on Kubernetes nodes.

5. **The pod diagnostic command did not match its stated purpose.** `kubectl get pods -o wide --all-namespaces | grep -v Running` filters by status rather than clearly showing pod IP assignment. Updated the command to list pod IPs and statuses directly.

6. **One troubleshooting row overstated a provider-specific fix as universal.** “Fix subnet in conflist and restart kubelet” is not generally correct for Flannel or Calico, where the effective network settings often come from Pod CIDR or IP pool configuration instead of a hand-edited conflist. Updated the row to refer to correcting IP pool or Pod CIDR configuration and restarting affected networking components if required.

7. **The exact error-string guidance was too specific.** Pod sandbox and CNI setup failures vary by runtime and plugin version. Updated the note to tell readers to look for sandbox or CNI setup errors in pod events rather than one hard-coded phrase.

## Review Notes
- The Flannel config example is still valid as written; the current upstream `kube-flannel.yml` manifest continues to ship a `10-flannel.conflist` with `cniVersion: "0.3.1"` and the `flannel` plus `portmap` plugin chain.
- The manual plugin execution example validates the generic CNI ADD/DEL flow using the reference `bridge` plugin. It is useful for local plugin testing, but it does not exercise Flannel’s or Calico’s full control-plane behavior.
