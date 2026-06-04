# Validation Summary: How to implement NetworkPolicy with Calico for advanced rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico service account policy rules
- Calico named ports
- calicoctl
- Felix configuration

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico service rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico workload endpoint reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl node command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix environment configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration

## Issues Found
- The post stated that standard Kubernetes NetworkPolicy denies everything by default. Updated this to clarify that pods are non-isolated until selected by a NetworkPolicy for a traffic direction, after which unmatched traffic for that direction is denied.
- The DNS egress rule used only a destination selector in a namespaced Calico NetworkPolicy. Added `namespaceSelector: projectcalico.org/name == "kube-system"` so the rule can match kube-dns/CoreDNS endpoints outside the policy namespace.
- The named-port example referenced Service port names as if Calico named ports were defined by the Service. Replaced the Service example with a Deployment that defines named container ports, and updated the explanation to say named ports come from endpoint/workload port definitions.
- The monitoring namespace examples used `namespaceSelector: name == "monitoring"`, which only works if that custom namespace label exists. Changed these to Calico's documented namespace label, `projectcalico.org/name == "monitoring"`.
- The testing section implied `calicoctl get workloadendpoint` shows policy rule matches for traffic flows. Updated the text to describe what the command actually provides: endpoint labels, addresses, and attributes used by selectors.
- The troubleshooting section labeled `calicoctl get felixconfiguration default -o yaml` as viewing policy counters. Updated the label to say it inspects Felix configuration.

## Review Notes
The Calico examples use current `projectcalico.org/v3` resources and valid Calico rule fields. The examples remain illustrative and assume matching namespaces, labels, service accounts, and Calico CRDs are installed in the target cluster.
