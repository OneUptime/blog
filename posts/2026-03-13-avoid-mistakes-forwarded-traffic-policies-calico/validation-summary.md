# Validation Summary: Common Mistakes to Avoid with Calico Forwarded Traffic Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- calicoctl
- Linux iptables data plane

## Sources Consulted
- Calico documentation: Apply on forwarded traffic - https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico documentation: Apply policy to forwarded traffic - https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico documentation: Host endpoint resource - https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Configuring calico/node - https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico libcalico-go API reference for v3 Rule fields - https://pkg.go.dev/github.com/projectcalico/libcalico-go/lib/apis/v3

## Issues Found
- The GlobalNetworkPolicy ingress rule matched destination ports without specifying a protocol. Calico policy rules require `protocol` when an entity rule contains ports, so I added `protocol: TCP` for SSH, HTTPS, and Kubernetes API server ports.
- The operational command used `sudo iptables -L -n | grep CALICO`, which is not reliable for Calico's iptables chain names and does not apply to non-iptables data planes. I changed the note to scope it to the iptables data plane and changed the command to `sudo iptables-save | grep cali-`.
- The Felix status command used `calico-node -felix-live`, but current Calico documentation lists the exec readiness flags including `-felix-ready`. I changed the command to `kubectl exec -n kube-system calico-node-xxx -- /bin/calico-node -felix-ready`.

## Review Notes
The HostEndpoint and GlobalNetworkPolicy API versions, `applyOnForward`, `preDNAT: false`, selector usage, `expectedIPs`, and `calicoctl get hostendpoints -o wide` usage are consistent with current Calico documentation. The post is still a concise example; production deployments should tailor host endpoint labels, failsafe assumptions, egress rules, and data-plane troubleshooting commands to the actual cluster.
