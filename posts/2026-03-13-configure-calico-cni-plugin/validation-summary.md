# Validation Summary: Configure Calico CNI Plugin

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico CNI plugin
- Kubernetes CNI configuration
- Calico IPAM and host-local IPAM
- Kubernetes `kubectl`
- CNI chained plugins: `portmap` and `bandwidth`

## Sources Consulted
- Calico Open Source documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico Open Source documentation: Install CNI plugin - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico Open Source documentation: Assign IP addresses based on topology - https://docs.tigera.io/calico/latest/networking/ipam/assign-ip-addresses-topology
- Calico Open Source documentation: Configure MTU to maximize network performance - https://docs.tigera.io/calico/latest/networking/configuring/mtu
- CNI specification - https://www.cni.dev/docs/spec/
- Kubernetes kubectl reference: `kubectl exec` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl reference: `kubectl run` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: `kubectl delete` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The IPAM example mixed `calico-ipam` with `subnet: usePodCidr`. Calico documents `usePodCidr` as a `host-local` IPAM subnet value, not as a `calico-ipam` field. I changed the example to use `host-local` IPAM with `usePodCidr`.
- The post described the `container_settings` block as configuring the container interface name. The CNI interface name is passed by the runtime in the CNI request, while Calico's `container_settings` block controls namespace settings such as `allow_ip_forwarding`. I changed the heading and explanation accordingly.
- The cross-subnet/cross-AZ wording implied `subnet: usePodCidr` was the Calico IPAM mechanism for topology-aware assignment. Calico documents topology-aware assignment through IP pools with `nodeSelector` rules, so I updated the text to point readers to that mechanism.

## Review Notes
The commands are syntactically consistent with current Kubernetes `kubectl` documentation, but the `calico-system` namespace and DaemonSet path assume an operator-style Calico installation. Manifest-based installations may use a different namespace or configuration delivery path.
