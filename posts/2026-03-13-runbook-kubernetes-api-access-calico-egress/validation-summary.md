# Validation Summary: Runbook: Kubernetes API Access Problems with Calico Egress Policy

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (network policy engine, including GlobalNetworkPolicy and calicoctl)
- Kubernetes (NetworkPolicy `networking.k8s.io/v1`, kubectl, services)
- Linux networking (netcat / `nc` for port reachability checks)
- Mermaid (flowchart diagram)

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API (`networking.k8s.io/v1`): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#networkpolicy-v1-networking-k8s-io
- `kubernetes.io/metadata.name` automatic namespace label (GA in Kubernetes 1.22+): https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/ and https://github.com/kubernetes/enhancements/tree/master/keps/sig-api-machinery/2161-apiserver-default-labels
- Calico GlobalNetworkPolicy / calicoctl reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy and https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico docs on Kubernetes API access policies: https://docs.tigera.io/calico/latest/network-policy/policy-rules/kubernetes-api
- kubectl reference (`get`, `exec`, `edit`, `--sort-by`, jsonpath): https://kubernetes.io/docs/reference/kubectl/
- BusyBox `nc` flags (`-z`, `-v`): https://www.busybox.net/downloads/BusyBox.html

## Issues Found
No technical issues found.

All commands, flags, and YAML manifests verified as syntactically correct and consistent with current documentation:
- `kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}'` correctly extracts the API service ClusterIP (the `kubernetes` service lives in the `default` namespace; this works when the current context targets `default`, which is the typical on-call assumption).
- `kubectl get pods -n $NAMESPACE -o name | head -1` returns `pod/<name>`, which is a valid argument to `kubectl exec`.
- `nc -zv` flags are supported by BusyBox netcat (most container images), GNU netcat, and BSD netcat.
- NetworkPolicy YAML uses correct `apiVersion: networking.k8s.io/v1`, `podSelector: {}`, `policyTypes: [Egress]`, `ipBlock` + `cidr` syntax, and a DNS allow rule via `namespaceSelector` with `kubernetes.io/metadata.name: kube-system` (GA label since Kubernetes 1.22).
- `calicoctl get globalnetworkpolicy -o yaml` is the correct invocation.
- `kubectl get networkpolicy --sort-by='.metadata.creationTimestamp'` is valid jsonpath sort.
- `grep -i "error\|timeout\|refused"` uses BRE alternation (`\|`), which is correct for default grep.
- Mermaid `flowchart TD` syntax is valid.

## Review Notes
- The "Quick fix" NetworkPolicy allows egress to the API server using `ipBlock` with the Kubernetes service ClusterIP. This is a commonly-shown pattern, but in clusters using iptables or IPVS kube-proxy the destination is DNAT'd to a backend endpoint (typically a control-plane node on port 6443) before NetworkPolicy is evaluated. In such clusters the rule may need to target the endpoints from `kubectl get endpoints kubernetes` and TCP/6443 instead. This is a well-known nuance and the runbook's flowchart already covers it with the "Check GlobalNetworkPolicy too" / fall-back branch, so the post is not technically incorrect — just worth knowing during incident response.
- The post implicitly assumes Kubernetes 1.22+ for the `kubernetes.io/metadata.name` namespace label; this is reasonable in 2026 but worth mentioning if anyone still runs older clusters.
