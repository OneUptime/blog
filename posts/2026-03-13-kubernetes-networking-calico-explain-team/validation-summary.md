# Validation Summary: How to Explain Kubernetes Networking for Calico Users to Your Team

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes networking
- Calico CNI
- Calico IPAM and IPPools
- Calico routing with BGP, Felix, VXLAN, and IP-in-IP
- Kubernetes NetworkPolicy and Calico policy enforcement
- kind
- kubectl
- calicoctl
- Linux routing and iptables

## Sources Consulted
- Kubernetes documentation: Services, Load Balancing, and Networking - https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kind documentation: Configuration - https://kind.sigs.k8s.io/docs/user/configuration/
- Calico documentation: Installing on kind - https://docs.tigera.io/calico/latest/getting-started/kubernetes/kind
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: The Calico data path: IP routing and iptables - https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico documentation: Overlay networking - https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny

## Issues Found
- The post said that without a CNI, pods cannot be scheduled. Kubernetes scheduling can still assign pods to nodes; the kubelet then fails to create the pod network sandbox when the CNI is unavailable. Updated the wording to distinguish scheduling from sandbox creation and node readiness.
- The ping demo used an unbounded `ping`, which can run indefinitely in an interactive demo. Updated it to `ping -c 3`.
- The cross-node routing section stated that every `via` route was programmed by Felix. In Calico, cluster routes may be distributed by BGP or programmed directly by Felix depending on routing mode and encapsulation. Updated the explanation to describe both cases.
- The post referred to a static `cali-pi-inbound-policy` iptables chain. Calico iptables chain names are generated and mode-dependent, so that chain name is not a stable command target. Replaced it with `iptables-save | grep cali-` to show the generated Calico chains.
- The /32 pod IP answer overstated that Calico always allocates per-pod host routes. Updated it to explain that local pod routes are typically /32 routes and inter-node routes may be blocks or individual workload routes depending on mode.
- The IPPool exhaustion answer said new pods fail to schedule. Updated it to say pods may be assigned to nodes, but sandbox creation fails when Calico IPAM cannot allocate an address.

## Review Notes
The examples assume the referenced `kind-no-cni.yaml` and `deny-all-ingress.yaml` files exist in the reader's demo environment. The post remains version-neutral; Calico routing and enforcement details can vary by dataplane and routing configuration, so the corrected wording avoids mode-specific absolutes.
