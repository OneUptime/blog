# Validation Summary: How to Test Encrypted Pod Traffic in Calico with Real Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- FelixConfiguration
- WireGuard
- kubectl
- calicoctl
- tcpdump

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico API source (`FelixConfigurationSpec`) confirming `wireguardMTU` JSON field name
- Kubernetes documentation: kubectl debug reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The introduction overstated encryption scope by claiming pod-to-pod communication cannot be intercepted "even by other processes on the same node." Calico's encryption guide explicitly lists "Encrypted same-node pod traffic" as Unsupported and states traffic is only encrypted on the host-to-host portion. Rewrote the introduction to scope encryption to supported inter-node pod traffic.
- The introduction referenced "WireGuard or IPsec" as Calico's data-plane encryption. The Calico Open Source WireGuard guide only documents WireGuard for in-cluster encryption. Tightened the wording to focus on WireGuard.
- The prerequisites said "WireGuard requires Linux kernel 5.6+". Calico documentation states WireGuard is included in 5.6+ kernels and has been backported to some earlier distribution kernels. Updated the prerequisite accordingly.
- The FelixConfiguration patch used `wireguardInterfaceMTU`, which is not a Felix field. The upstream `FelixConfigurationSpec` defines the field as `wireguardMTU` (JSON tag). Changed the patch to `wireguardMTU`.
- The verification step used `kubectl get node -o yaml | grep wireguard`. Calico's documented approach checks WireGuard node status via `calicoctl get node <NODE-NAME> -o yaml` (which surfaces `wireguardPublicKey`). Replaced the command.
- The `kubectl exec` examples used concrete-looking placeholder pod names (`calico-node-xxx`, `calico-node-node1`) and omitted the container name. Updated to explicit placeholders (`<CALICO_NODE_POD>`, `<CALICO_NODE_POD_ON_NODE1>`) and added `-c calico-node` to disambiguate the container.
- The Calico NetworkPolicy egress rule for the PostgreSQL backend omitted `protocol: TCP`, which would broaden the rule to all protocols on port 5432. Added `protocol: TCP` to narrow the rule.
- The packet-capture example used `--image=busybox`, but BusyBox does not ship `tcpdump`, and node debug for packet capture needs elevated capabilities. Switched to `--image=nicolaka/netshoot --profile=netadmin`, matching the Kubernetes node-debug guidance for network admin tooling.
- The architecture diagram labeled the inter-node arrow "WireGuard Encrypted", which implies end-to-end pod encryption. Relabeled it "Host-to-host WireGuard encryption" to reflect the actual scope.
- The conclusion claimed encryption for "all pod-to-pod traffic". Reworded to "supported inter-node pod traffic" to stay consistent with documented scope.

## Review Notes
Calico automatically manages WireGuard tunnels between nodes once `wireguardEnabled` is set, but traffic involving nodes without WireGuard installed (or same-node pod traffic) will not be encrypted. The post now uses placeholders for Calico node pod names; the reader still needs to select the `calico-node` pod scheduled on the node they want to inspect (e.g., via `kubectl get pod -n kube-system -l k8s-app=calico-node -o wide`). The `wireguardMTU` value of 1440 is reasonable for an underlying 1500-byte MTU but should be tuned for tunneled or jumbo-frame fabrics.
