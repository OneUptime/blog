# Validation Summary: How to Troubleshoot NetworkPolicy Blocking Pod Communication

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- kubectl
- Kubernetes label selectors
- Calico network policy and calicoctl
- Cilium policy troubleshooting
- tcpdump and netshoot debugging containers

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium host firewall policy verdict monitoring example: https://docs.cilium.io/en/stable/security/host-firewall/

## Issues Found
- The post described pod isolation as applying whenever any NetworkPolicy selects a pod. Updated the wording to clarify that isolation is per traffic direction, based on ingress and egress policy selection.
- The DNS egress example used separate `namespaceSelector` and `podSelector` peers, which means OR semantics rather than matching CoreDNS pods in `kube-system`. Combined them into one peer, used the standard `kubernetes.io/metadata.name` namespace label, and allowed both UDP and TCP port 53.
- The Calico logging example used an unsupported pod annotation for policy logging. Replaced it with a Calico `NetworkPolicy` example using the documented `Log` action and clarified that logs are found in node logs or configured log aggregation.
- The Cilium examples used older `cilium` CLI invocations. Updated them to use `cilium-dbg monitor -t policy-verdict` and `cilium-dbg endpoint list`, consistent with current Cilium troubleshooting docs.
- The tcpdump debugging guidance implied that no packets at the destination means the source side is blocking and that SYNs without response indicate return traffic policy blocking. Revised the comments to account for either source egress or destination ingress blocking and to direct SYN/no-response cases toward application, routing, or node-level filtering checks.
- The Calico WorkloadEndpoint command was shown as running inside a `calico-node` pod and claimed it showed all policies applied to the endpoint. Updated it to the documented `calicoctl get workloadEndpoint` form and clarified that it shows labels and profiles used during policy evaluation.
- The allow-vs-deny example said a `NotIn` selector does not work. Updated the comment to clarify that it is a valid allow rule for same-namespace pods whose `app` label is not `untrusted`, but it is not an explicit deny rule.

## Review Notes
The remaining `jq` examples are simplified and only catch direct `matchLabels.app` selectors, not every possible selector form such as `matchExpressions`. They are acceptable as quick troubleshooting examples, but a future improvement could mention that complex selectors require more complete inspection with `kubectl describe` or a policy analysis tool.
