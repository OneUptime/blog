# Validation Summary: How to Test Network Policies with Calico on Kind

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Calico
- Kind
- BusyBox
- nginx

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico Installing on Kind documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/kind
- Calico eBPF data plane documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- BusyBox wget help from the current busybox container image

## Issues Found
- The Step 2 text said "both pods" should be able to reach the backend, but the post only verifies frontend-to-backend connectivity. Changed this to "the frontend pod" to match the command shown.
- The Step 3 text said the default deny policy blocks ingress to the "backend namespace", but the namespace is `policy-test` and the policy's empty `podSelector` selects all pods in that namespace. Changed the wording to "pods in the `policy-test` namespace."
- The deny verification command used `wget --timeout=5` with the BusyBox image. BusyBox wget documents `-T SEC` for network read timeout, so the command was changed to `wget -T 5 -qO-`.

## Review Notes
The Kubernetes NetworkPolicy manifests use the current `networking.k8s.io/v1` API and the allow rule correctly selects backend pods while permitting ingress from same-namespace pods labeled `app=frontend`. Calico's standard Linux data plane is iptables based, and its eBPF data plane can also enforce policy, so the data plane explanation is accurate at a high level. In future revisions, the walkthrough could add `kubectl wait` commands before testing connectivity to avoid transient failures while images are still pulling.
