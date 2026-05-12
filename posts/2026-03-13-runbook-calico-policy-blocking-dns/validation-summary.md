# Validation Summary: Runbook: Calico Policy Blocking DNS

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (Kubernetes CNI)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Calico GlobalNetworkPolicy (CRD)
- CoreDNS (in `kube-system`)
- `kubectl` CLI
- BusyBox image (`nslookup`)
- Mermaid (diagram syntax)

## Sources Consulted
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- kubectl source code for the `run` subcommand: https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/run/run.go
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes automatic namespace label (`kubernetes.io/metadata.name`, GA in 1.22): https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/ and https://kubernetes.io/docs/concepts/services-networking/network-policies/#targeting-a-namespace-by-its-name
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- **Invalid `kubectl run` flag `--timeout=15s`** (appeared in both the diagnosis and verification commands). `kubectl run` does not register a `--timeout` flag — only `--pod-running-timeout` is wired up (via `cmdutil.AddPodRunningTimeoutFlag` in the kubectl source). Running the command as written produces `error: unknown flag: --timeout`. The `--timeout` flag exists on other subcommands (`kubectl wait`, `kubectl delete`, `kubectl rollout status`) but not `kubectl run`.
  - **Fix:** Replaced `--timeout=15s` with `--pod-running-timeout=15s` in both code blocks. This is the correct flag for bounding how long kubectl waits for the pod to reach Running state before giving up.

## Review Notes
- The emergency `NetworkPolicy` YAML is correct: `kubernetes.io/metadata.name` is the automatically applied namespace label (GA since Kubernetes 1.22), so the `namespaceSelector` matching `kube-system` works on any supported cluster. UDP/TCP port 53 covers both standard DNS and large/TCP fallback responses.
- The policy intentionally allows DNS to any pod in `kube-system`, not just CoreDNS pods specifically. This is the standard pragmatic pattern for emergency runbooks and matches common Calico/Kubernetes documentation guidance; a tighter rule using a `podSelector` on the CoreDNS pods (e.g., `k8s-app: kube-dns`) would be more least-privilege for the permanent fix but is reasonable to omit from an emergency policy.
- `busybox` `nslookup` historically has quirks across image versions (the BusyBox 1.28+ regression affecting `search` domains is well-known), but for testing resolution of `kubernetes.default` (a fully qualified service name within the cluster), this is fine.
- The `kubectl get networkpolicy ... --sort-by='.metadata.creationTimestamp' | tail -5` command is valid; a recent/large list will surface the most recent policies, which is the likely culprit in a "just changed something" incident.
- The mermaid `flowchart TD` syntax is valid.
- Recommendation for the author (not changed in this review): consider adding `--field-selector status.phase!=Failed` or similar guard if these debug pods could collide with stuck prior runs — minor robustness, not a correctness issue.
