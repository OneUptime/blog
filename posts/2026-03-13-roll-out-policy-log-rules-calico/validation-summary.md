# Validation Summary: How to Roll Out Calico Policy Log Rules Safely in Calico

## Status
validated

## Post Type
Tutorial / Guide (phased rollout playbook)

## Technologies Covered
- Calico (v3.26+) — `projectcalico.org/v3` API
- Calico `GlobalNetworkPolicy` and `NetworkPolicy` resources
- `calicoctl` CLI
- `kubectl` CLI
- Bash (loops, exit codes)
- Mermaid (for architecture diagram)

## Sources Consulted
- Calico documentation: NetworkPolicy / GlobalNetworkPolicy resource references — https://docs.tigera.io/calico/latest/reference/resources/networkpolicy and https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: `calicoctl` command reference — https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: `calicoctl get` (supports `--all-namespaces` / `-A`) — https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: `calicoctl apply` (supports `-f` and `-n`/`--namespace`) — https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: policy rule actions, including the `Log` action (non-terminating) — https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#rules
- kubectl reference: `kubectl exec`, `kubectl get events` — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Sibling post for cross-checking series conventions: `posts/2026-03-13-roll-out-staged-network-policies-calico-safely/README.md`

## Issues Found
No technical issues found. Verified:
- All bash commands are syntactically correct and use real, current flags.
- `calicoctl get networkpolicies --all-namespaces` is a supported invocation.
- `calicoctl apply -f <file>` is correct; `calicoctl apply -f <file> -n <ns>` is supported when the manifest itself does not pin a namespace, which matches how the Phase 4 loop is structured.
- `kubectl get events -n <ns>`, `kubectl exec -n <ns> <pod> -- curl ...`, and the `echo "Staging test: $?"` exit-code pattern are all correct.
- The `for ns in ...; do ... done` loop is well-formed Bash.
- API version `projectcalico.org/v3` and the named resources (`GlobalNetworkPolicy`, `NetworkPolicy`) are accurate.
- The Mermaid `flowchart TD` syntax parses; node/edge labels are valid.

## Review Notes
- The post is titled "Policy Log Rules" and the body uses "Policy Logging" interchangeably, but it never actually shows a policy that uses Calico's `action: Log` (or any YAML at all). It is a generic phased-rollout playbook that happens to be labelled for Log Rules. Everything written is technically valid, but a reader looking for an example of `action: Log` (the feature that produces the log lines Calico forwards to syslog / NFLOG) will not find one here. Left as-is because the review scope is correctness of what is written, not completeness.
- The Architecture mermaid diagram depicts an Allow / "No Match / Deny" terminating decision. Calico's `action: Log` is **non-terminating** — it records the match and continues policy evaluation. For a post specifically about Log rules a diagram that shows "Log + continue" alongside the subsequent Allow/Deny decision would be more faithful. The current diagram is internally consistent with the post's generic framing and is not actively wrong for a policy in general, so it was left unchanged per the "don't restructure" review guideline.
- The Mermaid node label `{Calico Policy\nPolicy Logging}` uses `\n` for a line break. Modern Mermaid (>= ~v9) renders `\n` as a newline inside `{...}` rhombus labels, but `<br/>` is the canonical, more portable form. Left as-is because the same pattern is used elsewhere in the post series.
- The Description says Policy Logging "provides fine-grained network security controls". Strictly, Calico's Log action is for observability/audit, not enforcement; the enforcement comes from the surrounding Allow/Deny rules in the same policy. The phrasing is loose but not incorrect since log rules live inside network policies that do provide controls.
- `Calico v3.26+` is a conservative floor — the `Log` action and the `projectcalico.org/v3` resources have been available since well before v3.26. Not wrong, just stricter than necessary.
- Minor grammatical roughness (e.g. "techniques for roll out Policy Logging", "Roll Out Policy Logging policies in Calico requires…") was left untouched because the review scope is technical accuracy, not copyediting.
