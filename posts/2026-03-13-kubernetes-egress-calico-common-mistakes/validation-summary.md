# Validation Summary: How to Avoid Common Mistakes with Kubernetes Egress with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico Cloud/Enterprise DNS policy
- Calico egress gateways
- Calico flow logs
- CoreDNS / Kubernetes DNS

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Calico Kubernetes policy advanced tutorial: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/kubernetes-policy-advanced
- Calico network policy best practices: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Cloud DNS policy: https://docs.tigera.io/calico-cloud/network-policy/domain-based-policy
- Calico Enterprise DNS policy: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico egress gateways guide: https://docs.tigera.io/use-cases/egress-gateways
- Calico EgressGatewayPolicy reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/egressgatewaypolicy
- Calico flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico FelixConfiguration flow-log options: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The DNS egress NetworkPolicy fragment used two separate egress rules: one allowing DNS ports to any destination, and one allowing all egress to the `kube-system` namespace. Kubernetes NetworkPolicy rules match the `to` and `ports` fields within the same rule, so the fragment was changed to place the namespace selector and DNS ports in a single egress rule.
- The FQDN policy recommendation incorrectly said to "switch to Open Source" as an alternative to Calico Cloud/Enterprise FQDN policies. Calico Open Source does not provide the same DNS/FQDN policy feature, so the wording now says that Open Source users must actively maintain IP-based policies.
- The flow-log example used `calicoctl get flowlogs`, but `flowlogs` is not a supported `calicoctl get` resource type. The example now points to the documented node flow-log file output path when file flow logs are enabled.

## Review Notes
The post mixes Kubernetes NetworkPolicy snippets and Calico policy snippets. That is technically acceptable in a Calico-backed Kubernetes cluster, but future edits should label snippets as Kubernetes NetworkPolicy or Calico policy to avoid confusion. Kubernetes NetworkPolicy behavior for non-TCP/UDP/SCTP protocols such as ICMP is plugin-dependent; the ICMP example is Calico policy syntax, not Kubernetes NetworkPolicy syntax.
