# Validation Summary: How to Fix Kubernetes API Access Problems with Calico Egress Policy

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes Services and Service DNS
- Kubernetes service account token authentication
- Calico GlobalNetworkPolicy
- Calico Service-based policy rules
- DNS egress policy

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes API access documentation: https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/
- Kubernetes authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico service policy documentation: https://docs.tigera.io/calico-cloud/network-policy/beginners/policy-rules/service-policy

## Issues Found
- The namespace-scoped Kubernetes NetworkPolicy example attempted to allow the Kubernetes API by combining `namespaceSelector` and `podSelector` entries incorrectly. As written, those were separate peers and did not select the `kubernetes` Service. Kubernetes NetworkPolicy also cannot target Services by name. I replaced this with an IP-based `ipBlock` example for the exact Kubernetes Service IP and direct API endpoint IP, and added a caveat that Service ClusterIP matching can vary by CNI.
- The diagnosis command fetched the `kubernetes` Service without explicitly specifying the `default` namespace. I changed it to `kubectl get svc kubernetes -n default` because the built-in API Service lives in the `default` namespace.
- The Calico GlobalNetworkPolicy example mixed the Service-based allow rule with a broad Service CIDR fallback. I kept the Calico `destination.services` rule for the `kubernetes` Service and changed the fallback to target direct API endpoint IPs on port 6443.
- The `kubectl exec` curl test used `$(cat /var/run/secrets/...)`, which would be expanded by the local shell before `kubectl exec` runs. I changed it to run `sh -c` inside the pod so the service account token is read from the pod filesystem.
- The Mermaid failure path and conclusion referenced checking the Service CIDR as the fallback. I updated them to point users toward the exact Service IP, DNS, and direct API endpoint IPs.

## Review Notes
The DNS egress NetworkPolicy is technically valid, but it allows TCP and UDP port 53 to all pods in `kube-system`. A production template could narrow this with DNS pod labels or a Calico Service rule for `kube-dns` where supported.
