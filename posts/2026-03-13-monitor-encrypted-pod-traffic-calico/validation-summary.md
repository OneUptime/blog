# Validation Summary: How to Monitor Encrypted Pod Traffic in Calico

## Status
validated

## Post Type
Tutorial / Guide

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
- Calico documentation: Encrypt in-cluster pod traffic, https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Network policy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: kubectl debug reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- nicolaka/netshoot project documentation, https://github.com/nicolaka/netshoot

## Issues Found
- The post described Calico encryption as protecting all pod-to-pod traffic, including same-node traffic. Calico WireGuard encrypts the host-to-host portion of inter-node pod traffic, while same-node traffic and host-to-pod portions are not encrypted by WireGuard. Updated the description, introduction, architecture label, and conclusion to use the correct scope.
- The post referenced IPsec in the standard Calico WireGuard workflow. The reviewed Calico documentation covers WireGuard for this feature, so the IPsec reference was removed.
- The FelixConfiguration patch used `wireguardInterfaceMTU`, which is not the documented Felix field. Replaced it with `wireguardMTU`.
- The verification command used `kubectl get node` to find WireGuard status. Calico documents checking Calico node status with `calicoctl get node <NODE-NAME> -o yaml`, so the command was corrected.
- The `kubectl exec` examples assumed Calico runs in `kube-system` and used placeholder pod names. Updated the examples to discover the `calico-node` namespace and pod by label before running `wg show`.
- The Calico NetworkPolicy egress rule had duplicate `destination` keys, which would drop the selector in many YAML parsers. Combined the selector and port under one `destination` object and added explicit TCP protocols to the TCP port rules.
- The packet capture command used a BusyBox image, which typically does not include `tcpdump`, and omitted a debug profile for packet capture capabilities. Replaced it with the `nicolaka/netshoot` image and `--profile=netadmin`.

## Review Notes
- The post now accurately describes Calico WireGuard as inter-node pod traffic encryption. It does not cover IPv6 WireGuard enablement via `wireguardEnabledV6` or managed-cluster host encryption via `wireguardHostEncryptionEnabled`; those are valid future additions but were outside the existing scope.
