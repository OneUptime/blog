# Validation Summary: How to Validate Encrypted Pod Traffic in Calico Before Production

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
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: kubectl debug reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post claimed Calico encryption protects all pod-to-pod traffic, including traffic visible to other processes on the same node. Calico documentation states WireGuard encrypts the host-to-host portion of inter-node pod traffic and does not encrypt same-node pod traffic. Updated the description, introduction, architecture label, and conclusion to reflect the supported encryption scope.
- The introduction referred to WireGuard or IPsec encrypting all data-plane traffic. The reviewed Calico Open Source WireGuard documentation covers WireGuard for in-cluster traffic and does not support that broad statement. Updated the wording to focus on WireGuard and supported in-cluster pod traffic.
- The prerequisites said WireGuard requires Linux kernel 5.6+. Calico documentation says WireGuard is included in Linux 5.6+ and has been backported to some earlier distribution kernels. Updated the prerequisite to avoid overstating the kernel requirement.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented Felix field. Updated it to `wireguardMTU`.
- The verification command used `kubectl get node -o yaml | grep wireguard`, while Calico documentation verifies WireGuard node status using Calico node status via `calicoctl get node <NODE-NAME> -o yaml`. Updated the command.
- The `kubectl exec` examples used concrete-looking placeholder pod names and omitted the container name. Updated them to explicit placeholders and `-c calico-node`.
- The Calico NetworkPolicy egress rule had a duplicate `destination` key, which would override the selector in YAML parsing. Merged the selector and ports into one `destination` block and added `protocol: TCP` for the database port rule.
- The packet capture example used `busybox`, which typically does not include `tcpdump`, and did not request a network administration debug profile. Updated it to use `nicolaka/netshoot` with `--profile=netadmin`.

## Review Notes
Calico automatically manages WireGuard tunnels between nodes when enabled, but traffic involving nodes without WireGuard installed will not be encrypted. The guide now uses placeholders for Calico node pod names; users still need to select the `calico-node` pod running on the node they want to inspect.
