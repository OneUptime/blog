# Validation Summary: How to Configure Service CIDR for IPv6 in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services and ClusterIP allocation
- IPv4/IPv6 dual-stack networking
- kubeadm cluster configuration
- kube-apiserver and kube-controller-manager flags
- kubectl commands and JSONPath output
- IPv6 Unique Local Addresses

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack support with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- kubeadm Configuration API v1beta4: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- kube-controller-manager command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes Service ClusterIP allocation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Extend Service IP Ranges: https://kubernetes.io/docs/tasks/network/extend-service-ip-ranges/
- Kubernetes Default ServiceCIDR Reconfiguration: https://kubernetes.io/docs/tasks/network/reconfigure-default-service-ip-ranges/
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291

## Issues Found
- The kubeadm configuration used `kubeadm.k8s.io/v1beta3`, which is deprecated in favor of `v1beta4` in current Kubernetes documentation. Updated the snippet to `v1beta4` and changed `extraArgs` from a string map to the current structured `name` / `value` list.
- The Service CIDR sizing examples counted raw addresses as service IP capacity. Updated the counts to subtract the two range endpoints, matching Kubernetes Service ClusterIP allocation documentation.
- The post implied `/108` was the current minimum practical IPv6 Service CIDR boundary. Clarified that `/108` is the legacy allocator limit for large IPv6 Service CIDRs and that Kubernetes v1.33+ with MultiCIDRServiceAllocator supports larger IPv6 ServiceCIDRs down to `/64`.
- The `kubectl get svc kubernetes -o jsonpath='{.spec.clusterIPs}'` example showed JSON-array output that JSONPath does not produce. Updated the command and example output to use `.spec.clusterIPs[*]`.
- The service creation pipeline used `kubectl patch` without `-o yaml`, so it would not emit a patched manifest for `kubectl apply`. Updated it to use `kubectl patch --local --type=merge -o yaml`.
- The service verification command used an invalid selector, `-l "":`. Added a label during service creation and updated the lookup to select that label.
- The monitoring snippet counted Service objects rather than allocated IPv6 ClusterIPs, which would include headless and ExternalName Services and miss dual-stack allocation details. Updated it to count IPv6 entries in `.spec.clusterIPs`.
- The example `fd00:svc::/108` was not a valid IPv6 address because IPv6 hextets are hexadecimal. Replaced it with a valid ULA example.
- The conclusion stated that Service CIDRs cannot be changed after initialization without migration. Updated it to reflect Kubernetes v1.33+ ServiceCIDR expansion while preserving the warning that replacing the primary Service CIDR still requires careful migration.

## Review Notes
The local environment did not include `kubectl`, `kubeadm`, `kube-apiserver`, or `kube-controller-manager` binaries, so command syntax was verified against the official Kubernetes command and component references rather than local `--help` output.
