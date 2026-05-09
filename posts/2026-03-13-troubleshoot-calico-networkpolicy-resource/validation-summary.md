# Validation Summary: Troubleshoot Calico NetworkPolicy Resource

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy and tiers
- Calico Felix metrics and logs
- Kubernetes NetworkPolicy concepts
- kubectl
- calicoctl

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico tiered policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Felix recommended metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Calico connection tracking reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/conntrack
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The first policy lookup used `calicoctl get networkpolicies` without `-o wide` while grepping for the selector. Calico's documented wide output includes the `SELECTOR` column, so the command was changed to `calicoctl get networkpolicies -n production -o wide | grep "app == 'backend'"`.
- The namespaced Calico NetworkPolicy order check sorted on column 3. Calico's namespaced wide output is `NAME ORDER SELECTOR`, so it was changed to sort on column 2.
- The common fix suggested adding a more specific allow policy even though the issue is unwanted allowed traffic. It was changed to recommend a more specific deny policy or rule with lower order than the catch-all allow.
- The selector test used `calicoctl get pods -l "app == 'backend'"`, but `calicoctl get` does not list Kubernetes pods or provide a Kubernetes-style label selector flag for that resource. It was changed to `kubectl get pods -n production -l app=backend --show-labels`.
- The GlobalNetworkPolicy order check sorted on column 4. Calico's documented wide output for global network policies is `NAME ORDER SELECTOR`, so it was changed to sort on column 2.
- The existing-connection retest command omitted the `production` namespace used throughout the examples. It was changed to `kubectl exec -n production frontend -- wget http://backend:8080`.

## Review Notes
The remaining troubleshooting guidance is technically sound for Calico installations that expose Felix metrics on port 9091 and use the standard `calico-system` namespace. Calico's own troubleshooting docs note that manifest-based installations may use `kube-system` instead of `calico-system`, so future versions of the post could mention that namespace caveat.
