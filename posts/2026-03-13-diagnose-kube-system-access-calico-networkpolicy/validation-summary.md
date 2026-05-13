# Validation Summary: How to Diagnose kube-system Access Problems with Calico NetworkPolicy

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- CoreDNS / kube-dns
- Kubernetes Metrics Server
- kubectl
- calicoctl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Kubernetes Metrics Server upstream documentation: https://github.com/kubernetes-sigs/metrics-server

## Issues Found
- The metrics-server symptom used `kubectl exec <pod> -- curl http://metrics-server.kube-system.svc/apis/metrics.k8s.io/v1beta1/pods`, which is not the normal or accurate way to query the Kubernetes Metrics API. Metrics Server exposes the `metrics.k8s.io` API through the Kubernetes aggregation layer, and the official documentation describes API server to Metrics Server traffic. Changed the example to `kubectl get --raw "/apis/metrics.k8s.io/v1beta1/pods"`.
- The namespace label inspection command used `kubectl get namespace kube-system -o jsonpath='{.metadata.labels}' | python3 -m json.tool`. Plain `jsonpath` output for a map is not guaranteed to be valid JSON for `python3 -m json.tool`. Changed it to `jsonpath-as-json` so the pipe receives valid JSON.

## Review Notes
- The NetworkPolicy diagnosis flow is technically sound: Kubernetes NetworkPolicy uses namespace labels for `namespaceSelector`, egress isolation requires explicit egress allow rules, and destination-side ingress policy can also block selected pods.
- The CoreDNS pod selector `k8s-app=kube-dns` is common but cluster-distribution dependent. If a cluster labels CoreDNS differently, operators should adjust the selector.
- Local `kubectl` and `calicoctl` binaries were not installed in the review environment, so command validation was performed against official CLI references and product documentation.
