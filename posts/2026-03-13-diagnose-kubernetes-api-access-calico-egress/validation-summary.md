# Validation Summary: How to Diagnose Kubernetes API Access Problems with Calico Egress Policy

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Kubernetes ServiceAccount authentication
- Kubernetes NetworkPolicy
- kubectl
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico policy log rules
- calicoctl

## Sources Consulted
- Kubernetes: Accessing the Kubernetes API from a Pod - https://kubernetes.io/docs/tasks/run-application/access-api-from-pod/
- Kubernetes: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes: kubectl debug reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes: Service concepts - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: NetworkPolicy concepts - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico: calicoctl apply reference - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico: calicoctl patch reference - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico: Felix configuration reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The Step 1 `kubectl exec` example used command substitution outside the pod, so `$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)` would be evaluated by the local shell instead of the container. Changed the example to run `sh -c` inside the pod, read the ServiceAccount token there, and use the mounted `ca.crt`.
- The Step 1 example used `curl -k`, even though Kubernetes documents using the in-cluster CA bundle when directly calling the API from a pod. Replaced it with `--cacert ${SERVICEACCOUNT}/ca.crt`.
- The Kubernetes Service IP lookup did not specify `-n default`, so it could fail or return the wrong result if the user's current namespace was not `default`. Added the explicit namespace.
- The post described checking Felix container logs for packet drops. Calico policy `Log` action output is documented as packet log output in node logs for the standard Linux dataplane, with eBPF policy logs available through the eBPF tracing path. Updated the wording and command to check node kernel logs for `calico-packet`.
- The Step 6 command patched an existing GlobalNetworkPolicy by replacing ingress and egress rules with `Log` and `Pass`, which could materially change enforcement behavior. Replaced it with a temporary Calico NetworkPolicy log rule scoped to the Kubernetes Service IP and port 443.
- The prevention section referred generically to Calico policy audit mode. Updated it to mention Calico log rules or staged policy, which better matches the documented Calico mechanisms.

## Review Notes
The diagnosis remains intentionally generic because Calico behavior can vary by dataplane and by whether policies are Kubernetes NetworkPolicy, Calico NetworkPolicy, or GlobalNetworkPolicy. The post now calls out Calico policy logs rather than implying ordinary Felix logs always contain per-packet deny events.
