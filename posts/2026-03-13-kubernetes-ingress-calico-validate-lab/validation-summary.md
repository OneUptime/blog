# Validation Summary: How to Validate Kubernetes Ingress with Calico in a Lab Cluster

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes kubectl CLI
- Calico NetworkPolicy
- Calico calicoctl CLI
- nginx and netshoot test pods

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico Kubernetes policy tutorial: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/kubernetes-policy-basic
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico NetworkPolicy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- netshoot Dockerfile and README: https://github.com/nicolaka/netshoot

## Issues Found
- The test pods were created and then used immediately. Since `kubectl run` does not guarantee the pod is Ready before returning, the following `kubectl exec` commands could fail before the validation actually starts. Added `kubectl wait --for=condition=Ready` commands for the target and client pods.
- The Calico NetworkPolicy example was applied with `kubectl apply`. Calico resources can be managed through Calico's API resources, but the post already requires `calicoctl` and Calico's current guide describes Calico policies as applied using `calicoctl`. Changed the example to `calicoctl apply -f -`.
- The Calico allow rule constrained `destination.ports` but did not set `protocol`. The official Calico examples use `protocol: TCP` when matching TCP ports. Added `protocol: TCP` to match the HTTP test traffic explicitly.
- Validation 5 expected the external namespace client to succeed while the explicit Calico `Deny` policy from Validation 4 would still be present and would deny any source other than `allowed-client`. Added `calicoctl delete networkpolicy calico-ingress-policy -n default` before the cross-namespace Kubernetes NetworkPolicy test.
- The external namespace client was created and then used immediately. Added a readiness wait before executing the connectivity test.

## Review Notes
The post uses "ingress" to mean incoming pod traffic controlled by NetworkPolicy, not the Kubernetes `Ingress` API object. That usage is technically valid in the NetworkPolicy context, but the title could be confused with Kubernetes Ingress resources in a future editorial pass.
