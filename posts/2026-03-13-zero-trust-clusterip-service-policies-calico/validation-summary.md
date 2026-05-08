# Validation Summary: Zero Trust ClusterIP Service Security with Calico Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes Services and ClusterIP networking
- Kubernetes and Calico CLI usage
- YAML configuration

## Sources Consulted
- Calico Open Source documentation: NetworkPolicy resource reference, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Apply Calico policy to services exposed externally as cluster IPs, https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Kubernetes documentation: Service, https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post described "ClusterIP Service Policies" as if Calico had a separate ClusterIP policy resource. Calico uses `NetworkPolicy` and `GlobalNetworkPolicy` resources that select endpoints, and special externally advertised ClusterIP cases require host/pod policy. Updated the wording to describe Calico NetworkPolicies securing pods behind ClusterIP Services.
- The introduction implied any source can reach ClusterIP Services. Kubernetes ClusterIP Services are cluster-internal by default; external reachability applies to NodePort, LoadBalancer, Ingress/Gateway, or ClusterIPs advertised externally, such as with Calico BGP. Updated the wording to make that boundary explicit.
- The egress database rule contained duplicate `destination` keys. In YAML, this can cause the selector to be overwritten by the later `destination` mapping, leaving only the port match. Merged the selector and port under a single `destination` block.

## Review Notes
The remaining Calico policy fields (`apiVersion`, `kind`, `order`, `selector`, `ingress`, `egress`, `action`, `source`, `destination`, `ports`, and `types`) match the documented Calico NetworkPolicy schema. The verification commands are syntactically plausible, but they depend on a real cluster, policy file name, namespace, pod, and service name being present.
