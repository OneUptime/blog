# Validation Summary: How to Validate Zero Trust Network Policy in Calico Before Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico NetworkPolicy
- Kubernetes network policy enforcement behavior
- kubectl exec
- Zero trust network segmentation

## Sources Consulted
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico log rules guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction implied that Calico permits nothing by default. Calico follows Kubernetes pod behavior when no policy applies, so pods are default-allow until policy selects them. I changed the statement to say that traffic is denied only with default-deny policies in place.
- The post claimed comprehensive logging of every traffic decision. Calico supports `Log` actions for selected matching traffic, but policies do not automatically log every decision. I changed this to refer to log rules for traffic decisions the operator chooses to observe.
- The global default-deny example used `selector: all()` across the whole cluster and a separate kubelet allow rule. Calico's default-deny guide warns that broad global default deny can affect system namespaces. I scoped the policy to non-system namespaces and kept DNS egress to kube-dns as the required system exception.
- The application allow example only allowed ingress to the API. With egress default deny enabled, frontend egress also needs an explicit allow. I added a matching frontend egress NetworkPolicy for TCP port 8080.
- The blocked-traffic verification commands used `random-ip` as a hostname and used HTTP against a database port. I changed the first to a named unauthorized service and the database test to a TCP connect check with `nc`.
- The architecture diagram still showed a broad all-traffic default deny and kubelet traffic exception. I updated it to match the corrected non-system workload and kube-dns policy model.

## Review Notes
The Calico policy examples use the current `projectcalico.org/v3` API and valid `GlobalNetworkPolicy` and `NetworkPolicy` fields. The validation commands assume the test containers include `curl` and `nc`; in minimal images, use a debugging image such as `nicolaka/netshoot` or install equivalent tools.
