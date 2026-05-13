# Validation Summary: How to Log and Audit Encrypted Pod Traffic in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico FelixConfiguration
- WireGuard
- kubectl
- calicoctl
- tcpdump

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic: https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: NetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes documentation: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- WireGuard wg man page: https://man7.org/linux/man-pages/man8/wg.8.html

## Issues Found
- The introduction claimed Calico encrypted all pod-to-pod traffic and protected against same-node interception. Calico WireGuard encrypts the host-to-host portion of inter-node pod traffic; same-node traffic and host-to-pod portions are not encrypted. Updated the wording to match Calico documentation.
- The post description and encryption overview implied all inter-pod traffic was encrypted. Updated both to specify inter-node pod traffic.
- The introduction described "WireGuard or IPsec" as the mechanism for the guide, but the guide only configures Felix WireGuard encryption. Updated the wording to focus on WireGuard.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not a current FelixConfiguration field. Replaced it with `wireguardMTU`.
- The verification command used `kubectl get node -o yaml | grep wireguard`, but Calico documents checking node WireGuard status with `calicoctl get node <NODE-NAME> -o yaml` and the `wireguardPublicKey` status fields. Updated the command accordingly.
- The NetworkPolicy egress rule contained duplicate `destination` keys, which makes the YAML ambiguous and drops one mapping in many parsers. Merged the destination selector and ports under a single `destination` key.
- The policy rules used ports without explicit TCP protocol for application/database traffic. Added `protocol: TCP` to align with Calico's port-matching examples.
- The packet capture example used `busybox`, which commonly lacks `tcpdump`. Replaced it with a Kubernetes node-debug flow using `ubuntu`, `--profile=sysadmin`, and installing `tcpdump`, consistent with Kubernetes node-debug documentation.
- The architecture diagram said policy is evaluated before encryption. Calico documentation supports that policy and encryption work together, but does not make that exact ordering claim in the reviewed source. Updated the label to "Applies alongside encryption."
- The conclusion claimed encryption for all pod-to-pod traffic. Updated it to inter-node pod traffic and on-the-wire encryption.

## Review Notes
The post is now technically accurate for Calico WireGuard encryption, but it remains a high-level audit guide. A future improvement could add a concrete pod-to-pod traffic generation example so readers can correlate `wg show` transfer counters with a known test flow.
