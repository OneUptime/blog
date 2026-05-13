# Validation Summary: How to Monitor Calico Host Endpoint Policy Impact

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- Felix / calico-node
- Linux iptables dataplane inspection

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host endpoint forwarding policy documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calico/node configuration and readiness documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The GlobalNetworkPolicy ingress rule matched destination ports without specifying a protocol. Calico policy examples and validation expectations require a transport protocol when matching ports, so I added `protocol: TCP` to the allow rule for ports 22, 443, and 6443.
- The operational command used `calico-node -felix-live` for a generic Felix status check. Current Calico documentation describes the exec readiness endpoint with `/bin/calico-node -felix-ready`, so I updated the command accordingly.
- The description claimed the post used Felix metrics, but the post uses a Felix health/readiness check rather than Prometheus metrics. I changed the description to say Felix health checks.

## Review Notes
The HostEndpoint and GlobalNetworkPolicy API versions and fields are current for Calico Open Source 3.32 and are compatible with the stated Calico v3.26+ prerequisite. The `kube-system` namespace in the `kubectl exec` example is valid for common manifest-based installs, but operator-based installs often place Calico components in `calico-system`, so readers may need to adjust the namespace for their installation.
