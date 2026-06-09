# Validation Summary: How to Implement Kubernetes Egress Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy API (`networking.k8s.io/v1`)
- CoreDNS / kube-dns
- Calico CNI (FelixConfiguration)
- Cilium CNI (Hubble, policy verdicts)
- Prometheus + PrometheusRule (monitoring.coreos.com/v1)
- kubectl
- netshoot debug image

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- NetworkPolicy v1 API: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#networkpolicy-v1-networking-k8s-io
- The `kubernetes.io/metadata.name` automatic namespace label (KEP-2161, available since Kubernetes 1.22 stable)
- CoreDNS labels and kube-dns service compatibility
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/ (specifically `cilium_policy_verdict_total` labels: `direction`, `match`, `action`)
- Cilium Hubble CLI: https://docs.cilium.io/en/stable/observability/hubble/
- Calico Project FelixConfiguration: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/

## Issues Found
1. **Incorrect Cilium Prometheus metric label name**: The PrometheusRule used `cilium_policy_verdict_total{verdict="denied"}`, but the actual label on this metric is `action` (with values `allowed`, `denied`, `audit`), not `verdict`. Changed `verdict="denied"` to `action="denied"` in both alert expressions.
2. **Incorrect direction label value casing**: The query used `cilium_forward_count_total{direction="EGRESS"}` (all-caps) and `cilium_policy_verdict_total{direction="egress"}` (lowercase), which are inconsistent and don't match the canonical Cilium label values. Cilium emits these direction label values as `Ingress` and `Egress` (capitalized first letter). Updated both to `direction="Egress"`.

## Review Notes
- The NetworkPolicy YAML examples are syntactically and semantically correct. The `to` peer with both `namespaceSelector` and `podSelector` under a single list entry (AND semantics) is used correctly throughout.
- The use of `kubernetes.io/metadata.name: kube-system` for namespace selection is the recommended approach since Kubernetes 1.22 (the label is automatically set by the kube-apiserver).
- The `k8s-app: kube-dns` selector for CoreDNS pods is correct — CoreDNS keeps this label by default for backward compatibility with kube-dns clients/policies.
- The `egress: []` paired with `policyTypes: [Egress]` correctly implements default-deny egress.
- The Calico `FelixConfiguration` fields (`flowLogsFileEnabled`, `flowLogsFileIncludeLabels`, `flowLogsFileIncludePolicies`, `flowLogsFlushIntervalSeconds`, `flowLogsEnableHostEndpoint`) are primarily Calico Enterprise (Tigera) features rather than upstream open-source Project Calico. Readers using open-source Calico may not have these flow log features available. Not strictly incorrect as written, but worth flagging as a version/edition caveat.
- The `nicolaka/netshoot` debug image with `runAsNonRoot: true, runAsUser: 1000` will work for basic curl/nslookup testing, but tools requiring raw sockets (e.g., `traceroute`, `ping`) may fail without additional capabilities. This is acceptable since the post primarily demonstrates curl-based tests.
- External IP ranges shown (Stripe 35.190.247.0/24, SendGrid 167.89.0.0/17, Twilio, AWS, Firebase/Google) are labeled "example" — readers should consult the providers' current published IP ranges before using them in production policies.
- All `kubectl` commands and flags (`apply -f`, `get networkpolicy`, `wait --for=condition=Ready`, `exec -n`, `label namespace`) are valid current CLI syntax.
