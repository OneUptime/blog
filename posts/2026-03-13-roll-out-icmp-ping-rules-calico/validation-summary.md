# Validation Summary: How to Roll Out ICMP and Ping Rules Safely in Calico

## Status
validated

## Post Type
Tutorial / Guide (phased rollout playbook)

## Technologies Covered
- Calico (v3.26+) network policy
- Calico `projectcalico.org/v3` API (`GlobalNetworkPolicy`, `NetworkPolicy`)
- ICMP / ICMPv6 protocol filtering in Calico
- `calicoctl` CLI
- `kubectl` CLI
- Mermaid (architecture diagram)

## Sources Consulted
- Calico NetworkPolicy reference (ICMP rule fields): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- calicoctl command reference (`get`, `apply`, `--namespace`, `--all-namespaces`): https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico v3.26 release notes: https://docs.tigera.io/calico/3.26/release-notes/
- kubectl reference (`get events`, `exec`, `-n`): https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found.

The `calicoctl get networkpolicies --all-namespaces`, `calicoctl apply -f <file>`, and `calicoctl apply -f <file> -n <ns>` invocations are all valid — calicoctl supports both `--all-namespaces` and `-n/--namespace` for namespaced resources. The `kubectl get events`, `kubectl exec` and shell loop usages are syntactically correct. The claim that Calico's `projectcalico.org/v3` API supports ICMP-based rules through `GlobalNetworkPolicy` and `NetworkPolicy` (via the `icmp`/`notICMP` rule fields) is accurate.

## Review Notes
- The post is intentionally a generic phased-rollout playbook and never shows an actual `icmp:` rule snippet (e.g., `icmp: { type: 8, code: 0 }` for echo-request). Adding a concrete ICMP rule example in a future revision would make the guide much more useful, but its absence is not a technical error.
- The Mermaid node label uses `\n` for a line break inside a decision node (`B{Calico Policy\nICMP Rules}`). This still renders in current Mermaid versions, but `<br/>` is the more reliable modern syntax. Not a technical error.
- The Phase 3 verification uses `curl` over HTTP/8080, which exercises a TCP path rather than ICMP. For an ICMP-rule rollout, a `ping` (or `ping6`) probe from the test pod would be a more direct functional check. The current command still validates that general traffic is unaffected, so it is not incorrect.
- Calico v3.26 (April 2023) is the stated minimum; current Calico is in the v3.28–v3.29 line. The "v3.26+" wording remains accurate.
- When `calicoctl apply -f` is used with `-n`, the namespace embedded in the manifest's `metadata.namespace` (if any) takes precedence — readers should ensure their YAML is either namespace-agnostic or matches the `-n` value to avoid surprises.
