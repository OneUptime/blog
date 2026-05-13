# Validation Summary: How to Configure Forwarded Traffic Policies for Calico Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- calicoctl
- kubectl
- Linux iptables dataplane

## Sources Consulted
- Calico documentation: Apply policy to forwarded traffic: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico documentation: Apply on forwarded traffic reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico documentation: HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico documentation: GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Configuring calico/node and Felix readiness checks: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The GlobalNetworkPolicy example matched destination ports without specifying a protocol. Calico policy examples and rule semantics pair L4 ports with a transport protocol, so I added `protocol: TCP` to the ingress allow rule.
- The implementation steps created the HostEndpoint before applying the host protection policy. Calico recommends creating policies before HostEndpoint objects because a HostEndpoint without matching policy changes default traffic handling for local host traffic. I reordered the commands to apply the policy first.
- The operational command used `calico-node -felix-live` for a Felix status check. The official calico/node documentation lists `/bin/calico-node -felix-ready` as the exec readiness endpoint, so I updated the command accordingly.
- The iptables inspection comment implied generic policy decisions. I clarified that the command shows host-level policy rules on the iptables dataplane, since Calico deployments may use other dataplanes.

## Review Notes
The post is technically relevant and uses the current `projectcalico.org/v3` API. The examples are still placeholders and need environment-specific node names, interface names, IPs, namespaces, and pod names before use in a real cluster.
