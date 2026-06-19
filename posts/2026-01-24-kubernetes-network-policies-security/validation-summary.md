# Validation Summary: How to Configure Kubernetes Network Policies for Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy API (`networking.k8s.io/v1`)
- Kubernetes pod, namespace, and label selectors
- Kubernetes Services and DNS
- `kubectl` commands
- CNI network policy enforcement
- Calico, Cilium, Weave Net, and Flannel

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The default-deny loop used `kubectl apply -f default-deny-all.yaml -n $ns` while the manifest already set `metadata.namespace: production`. Because the manifest namespace is part of the object, this would not reliably apply the same policy to staging and development. Changed the command to replace the namespace in the manifest before applying it.
- The Kubernetes API Server egress example described the `kubernetes` Service cluster IP as the API server IP. Kubernetes documents that `ipBlock` rules should generally target cluster-external IPs and Service IP handling can vary because of address rewriting. Clarified that users should use the real API server endpoint IP, or the Kubernetes Service cluster IP only if their CNI enforces policy before Service DNAT.
- The Prometheus scrape example used port `9090` without clarifying that NetworkPolicy ingress ports are destination pod ports. Added a note that the port should be the metrics port exposed by the selected pods.
- The deny-all test expected only a curl timeout. Since the policy also denies egress DNS, using `http://server` may fail with DNS resolution instead. Updated the expected result to allow either timeout or DNS resolution failure.

## Review Notes
The NetworkPolicy manifests use the current stable `networking.k8s.io/v1` API and parsed successfully as YAML. The post correctly states that NetworkPolicy enforcement depends on a supporting CNI plugin and that policies are additive. DNS pod labels can vary by cluster distribution, so users may still need to adjust the `kube-dns` selector for their environment.
