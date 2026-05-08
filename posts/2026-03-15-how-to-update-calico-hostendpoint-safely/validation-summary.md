# Validation Summary: How to Update the Calico HostEndpoint Resource Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico HostEndpoint resources
- Calico GlobalNetworkPolicy and host endpoint policy behavior
- Calico FelixConfiguration and failsafe ports
- `calicoctl`
- Kubernetes `kubectl`

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoints overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico forwarded traffic behavior for host endpoints: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico failsafe rules reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl replace` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl` overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The introduction said a HostEndpoint mistake can block pod networking broadly. Calico host endpoint policy does not apply to forwarded traffic by default; it applies to forwarded pod traffic when policies use `applyOnForward`. Updated the wording to make that condition explicit.
- The single-resource backup command did not use `--export`. Calico documents `--export` for stripping cluster-specific information when saving a named resource for later modification or replacement. Added `--export` to the named HostEndpoint backup command.
- The Felix liveness check used `kubectl exec` without naming the `calico-node` container. Added `-c calico-node` so the command is unambiguous in multi-container Calico pods.
- The troubleshooting section said mismatched `expectedIPs` can make Felix not apply rules correctly. Calico documents `expectedIPs` as the field used to resolve label selectors to IP addresses when rendering rules on other hosts. Updated the wording to describe selector-based policy resolution accurately.
- The conclusion described `calicoctl replace` as atomic. Calico documents `replace` as replacing complete resources from a file or stdin, and multi-resource replacement is processed in order rather than as a transaction. Updated the wording to "complete-resource updates."

## Review Notes
The examples assume a Calico installation where `calico-node` pods are in `calico-system` and labeled `k8s-app=calico-node`. Some manifest-based installations use `kube-system`, so operators may need to adjust the namespace for their cluster.
