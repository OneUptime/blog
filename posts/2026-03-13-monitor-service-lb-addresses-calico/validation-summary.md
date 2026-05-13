# Validation Summary: How to Monitor Service Load Balancer Addresses with Calico

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Calico (Project Calico) v3.20+
- Kubernetes Services (LoadBalancer type)
- calicoctl CLI
- kubectl CLI
- Calico IPAM
- IPPool custom resource (projectcalico.org/v3)
- BGP configuration

## Sources Consulted
- Calico official documentation: https://docs.tigera.io/calico/latest/
- calicoctl ipam reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- BGPConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico v3.20 release notes (introduced `calicoctl ipam check`)
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
No technical issues found.

- `calicoctl get ippools -o yaml` — valid command and flag.
- `calicoctl get bgpconfiguration -o yaml` — valid command and flag.
- `calicoctl ipam check` — valid; this consistency-check subcommand was introduced in Calico v3.20, consistent with the stated prerequisite.
- `kubectl get svc -A` — valid kubectl shorthand for `--all-namespaces`.
- IPPool YAML uses correct apiVersion (`projectcalico.org/v3`), kind, and spec fields (`cidr`, `natOutgoing`).
- Mermaid diagram syntax is valid.

## Review Notes
- The post is intentionally generic and surface-level; the IPPool example is a standard pod-network pool rather than a Service-LoadBalancer-specific pool. For dedicated LoadBalancer service IP allocation by Calico (without MetalLB), Calico v3.28+ introduced the `allowedUses: ["LoadBalancer"]` and `assignmentMode: Manual` fields on IPPool. The post does not claim to demonstrate this newer capability, so the v3.20+ prerequisite is technically correct for the commands shown, but readers interested specifically in Calico-native LoadBalancer IPAM would need v3.28+.
- The post focuses on monitoring/verification commands rather than the full LoadBalancer wiring (e.g., BGP advertisement of service IPs via `serviceLoadBalancerIPs` in BGPConfiguration), which is a reasonable scoping choice but could be expanded in a future revision.
