# Validation Summary: How to Prevent Network Policy from Not Taking Effect in Calico

## Status
validated

## Post Type
Guide / Operational best-practices

## Technologies Covered
- Calico (projectcalico.org/v3 NetworkPolicy API)
- Kubernetes NetworkPolicy (networking.k8s.io)
- kubectl
- busybox / netcat (nc)
- jq
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico policy rules and actions (Allow, Deny, Log, Pass): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#rules
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- kubectl exec / jsonpath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- BusyBox netcat applet documentation (supports `-z` and `-v`)
- jq manual: https://jqlang.github.io/jq/manual/ (to_entries, select)

## Issues Found
No technical issues found.

Verification details:
- `apiVersion: projectcalico.org/v3` + `kind: NetworkPolicy` is the correct Calico CRD pairing.
- Calico NetworkPolicy uses `spec.types` (with values `Ingress`/`Egress`), distinct from Kubernetes' `spec.policyTypes`. The post uses the correct Calico field.
- Calico's `action: Log` is documented as non-terminating: it logs the packet and rule processing continues to the next rule. Combining it with a subsequent `action: Pass` rule is a valid pattern to audit traffic without enforcing a verdict in the current policy.
- `spec.selector: app == '<target>'` uses Calico's selector DSL correctly.
- `kubectl run pre-test --image=busybox --restart=Never -- sleep 120` is valid; current kubectl creates a Pod (the `--restart=Never` flag is retained for compatibility).
- `kubectl get pod <target-pod> -o jsonpath='{.status.podIP}'` returns the pod IP correctly.
- BusyBox `nc -zv` supports zero-I/O port scanning with verbose output.
- The jq snippet works: `select(.spec.podSelector.matchLabels | to_entries[] | .value == "<old-label>")` outputs the policy once per matching label entry (may duplicate names if multiple labels match the value, but functionally lists the right policies).

## Review Notes
- The jq filter examines `kubectl get networkpolicy`, which queries the Kubernetes NetworkPolicy API (`networking.k8s.io`). To also include Calico-native NetworkPolicies, readers would need `kubectl get networkpolicies.projectcalico.org` (or `calicoctl get networkpolicy`). This is a scope nuance rather than an error.
- "Audit mode" is used informally in the post. Calico Enterprise has a formal "Staged Network Policy" feature for audit, while OSS Calico relies on the Log+Pass pattern shown — which is correct as described.
- The jq query could produce duplicate policy names when multiple label values match; deduplication (e.g., `| unique` after collecting names) would be cleaner but is not a correctness issue.
