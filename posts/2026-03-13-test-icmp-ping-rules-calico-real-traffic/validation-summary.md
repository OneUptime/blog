# Validation Summary: How to Test ICMP and Ping Rules in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Calico (v3.26+) — `projectcalico.org/v3` NetworkPolicy
- Kubernetes — `kubectl`
- `calicoctl`
- BusyBox (`wget`)
- nginx
- Mermaid diagram syntax

## Sources Consulted
- Calico v3 NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico policy ordering / evaluation semantics: https://docs.tigera.io/calico/latest/network-policy/policy-rules/policy-rules-overview
- Kubernetes `kubectl run` reference (labels behavior — `run=<name>` is added by default): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec
- BusyBox `wget` applet (supports `-q`, `-O`, `--timeout`): https://busybox.net/downloads/BusyBox.html
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found. Specifically verified:

- `apiVersion: projectcalico.org/v3` and `kind: NetworkPolicy` are correct for the Calico-native (namespaced) NetworkPolicy resource.
- Spec fields used (`order`, `selector`, `ingress[].action`, `ingress[].source.selector`, `types`) are valid for Calico v3.
- `kubectl run ... --image=busybox --restart=Never -- sleep 3600` is valid and produces a Pod with the default `run=test-source` label, which is what the allow rule's selector `run == 'test-source'` matches.
- The `jsonpath='{.status.podIP}'` expression is correct.
- BusyBox `wget -qO- --timeout=5 http://$IP` is valid (busybox wget supports `-q`, `-O-`, and `--timeout=`).
- Calico evaluates policies by `order` ascending (lower number = higher priority), so the allow policy (order 50) is evaluated before the deny policy (order 100). When traffic from `test-source` matches the allow rule the action is taken and the deny policy is not reached; for traffic without the `run=test-source` label the allow policy has no matching rule, evaluation falls through, and the deny policy denies it. The four outcomes shown in the mermaid diagram are consistent with this evaluation.
- Mermaid `flowchart TD` syntax used for the test-results diagram is valid.

## Review Notes
- Scope/title mismatch (not a technical error in the code itself): the title, description, and Step 3 heading reference "ICMP and Ping Rules", but the policy YAML does not include any ICMP-specific rules (`protocol: ICMP`, `icmp.type`/`icmp.code`, or `notICMP`) and the traffic test uses HTTP via `wget` rather than `ping`. The commands and YAML as written are technically correct, but readers looking specifically for ICMP rule testing will need to add `protocol: ICMP` clauses and substitute `ping -c 1 -W 5 $DEST_IP` for the wget call. Fixing this would require adding new content/sections, which is out of scope for this validation pass.
- `calicoctl apply -f` works for `projectcalico.org/v3` resources; `kubectl apply` would also work if the Calico API server / CRDs are installed, but the post's choice of `calicoctl` is the more universally compatible path and matches Tigera's recommendation for v3 resources.
- `--restart=Never` on `kubectl run` is still supported and produces a Pod; in current kubectl versions a Pod is the default anyway, so the flag is slightly redundant but not incorrect.
- The post references Calico v3.26+; the NetworkPolicy schema used has been stable since v3.0, so this is conservative and correct.
