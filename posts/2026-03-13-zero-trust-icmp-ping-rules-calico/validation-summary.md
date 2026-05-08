# Validation Summary: Zero Trust with ICMP and Ping Rules in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Calico `GlobalNetworkPolicy` and `NetworkPolicy` resources
- ICMP and ICMPv6 ping traffic
- `kubectl exec`

## Sources Consulted
- Calico documentation: Use ICMP/ping rules in policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico documentation: Global network policy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Network policy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Enable a default deny policy for Kubernetes pods, https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Kubernetes documentation: `kubectl exec`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- IANA ICMP parameters, https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml
- IANA ICMPv6 parameters, https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml

## Issues Found
- The default-deny `GlobalNetworkPolicy` selected `all()` endpoints across the cluster, including system namespaces and host endpoints. I added a `namespaceSelector` for the `production` namespace so the example aligns with the namespace-scoped policy shown later and avoids accidentally applying a global default deny to cluster infrastructure.
- The "ICMP Rules" policy did not actually match ICMP traffic. I added `protocol: ICMP`, `protocol: ICMPv6`, and `icmp.type` matches for IPv4 and IPv6 echo request traffic, using the Calico policy schema and IANA type assignments.
- The DNS egress allow rule used only UDP port 53 and had no namespace or endpoint selector for kube-dns. I added TCP port 53 and scoped both DNS rules to `kube-system` pods labeled `k8s-app == "kube-dns"`.
- The verification command used `curl` against an HTTP service, which does not validate ICMP/ping policy behavior. I changed it to resolve a protected pod IP with `kubectl get pod ... -o jsonpath=...` and run `ping` through `kubectl exec`.

## Review Notes
The examples now use current Calico `projectcalico.org/v3` resources and current Kubernetes `kubectl exec ... -- COMMAND [args...]` syntax. The command examples assume the named pods exist, the protected pod has the `app=protected-service` label, and the container image used for `unauthorized-pod` includes `ping`.
