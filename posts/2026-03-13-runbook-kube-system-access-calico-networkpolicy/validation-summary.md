# Validation Summary: Runbook: kube-system Access Problems with Calico NetworkPolicy

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Kubernetes (NetworkPolicy API `networking.k8s.io/v1`)
- Calico (CNI / NetworkPolicy enforcement)
- CoreDNS (kube-system DNS service)
- kubectl CLI
- metrics-server (kubectl top, `/apis/metrics.k8s.io/v1beta1`)
- BusyBox `nslookup`
- Mermaid (flowchart diagram)

## Sources Consulted
- Kubernetes NetworkPolicy concept docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- NetworkPolicy `networking.k8s.io/v1` API reference (apiVersion, kind, spec.podSelector, policyTypes, egress.to.namespaceSelector, ports)
- Automatic `kubernetes.io/metadata.name` namespace label (NamespaceDefaultLabelName, GA in Kubernetes 1.22)
- metrics-server API path `/apis/metrics.k8s.io/v1beta1/namespaces/<ns>/pods`

## Issues Found
No technical issues found.

Specific items verified:
- `kubectl run ... --restart=Never --rm -i --timeout=10s -- nslookup ...`: `--timeout` is a valid flag on `kubectl run` (controls timeout for the `--rm` delete operation). The flag exists and the command is syntactically correct.
- `kubectl get networkpolicy --sort-by='.metadata.creationTimestamp'`: valid JSONPath sort syntax.
- NetworkPolicy YAML: `apiVersion: networking.k8s.io/v1`, `kind: NetworkPolicy`, `spec.podSelector: {}` (all pods), `policyTypes: [Egress]`, and the egress rule with `namespaceSelector.matchLabels.kubernetes.io/metadata.name: kube-system` plus UDP/TCP port 53 are all correct and idiomatic for allowing DNS egress to CoreDNS.
- Use of the automatic `kubernetes.io/metadata.name` label for selecting `kube-system` is the recommended modern approach (available since the NamespaceDefaultLabelName feature went GA in 1.22).
- `kubectl edit networkpolicy`, `kubectl delete networkpolicy`, `kubectl top pods` are valid commands.
- `kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/$NS/pods` is the correct metrics.k8s.io API path.
- Mermaid `flowchart TD` diagram is syntactically valid.

## Review Notes
- The semantics of `--timeout=10s` on `kubectl run --rm` apply to the pod-delete operation, not to a bound on how long `nslookup` runs inside the pod. In practice this is fine because BusyBox `nslookup` has its own internal DNS timeouts/retries (a few seconds), so the loop will not hang indefinitely. If stricter wall-clock bounding is desired, wrapping the `kubectl run` invocation with the shell `timeout` command (e.g. `timeout 15s kubectl run ...`) would be more deterministic — but this is a stylistic refinement, not a correctness fix.
- The emergency policy is purely additive (NetworkPolicies are union/allow-list), so applying it cannot make connectivity worse — a good runbook property.
- The diagnosis loop creates a transient pod in every namespace, including `kube-system`. That works but on hardened clusters Pod Security admission may reject `busybox` in restricted namespaces; if so, the operator may need to pick a less-restricted source namespace or use an ephemeral debug container instead.
- The post correctly notes DNS uses both UDP/53 and TCP/53. Including TCP/53 is important for large responses and DNS-over-TCP fallback.
