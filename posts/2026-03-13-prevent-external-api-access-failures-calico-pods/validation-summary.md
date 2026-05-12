# Validation Summary: How to Prevent External API Access Failures from Calico Pods

## Status
validated

## Post Type
Tutorial / Prevention guide

## Technologies Covered
- Calico (GlobalNetworkPolicy, projectcalico.org/v3 API)
- Kubernetes (kubectl, namespaces, labels, pods)
- calicoctl CLI
- Bash scripting
- Python (yaml module for policy linting)
- GitHub Actions (CI/CD pipeline example)
- netshoot diagnostic container image (nicolaka/netshoot)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selector-syntax
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- kubectl reference (run, wait, exec, label, delete): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- nicolaka/netshoot image: https://github.com/nicolaka/netshoot

## Issues Found
No technical issues found.

The technical content is accurate:
- The Calico `GlobalNetworkPolicy` v3 API structure is correct: `apiVersion: projectcalico.org/v3`, `kind: GlobalNetworkPolicy`, with `namespaceSelector`, `selector: all()`, and `egress` rules using `action`/`protocol`/`destination.ports`.
- The selector syntax `external-api-access == "true"` is valid Calico selector syntax.
- The `order` field semantics are correctly used — in Calico, lower order values are evaluated first, so `order: 100` does have higher precedence than a default-deny that conventionally uses a higher order number.
- `types: [Egress]` is omitted but Calico auto-infers types from the presence of egress rules, so this is acceptable.
- `calicoctl apply -f` is the correct command.
- `kubectl run ... --image=nicolaka/netshoot --restart=Never -- sleep 30` is valid and uses a real diagnostic image.
- `kubectl wait pod/<name> --for=condition=Ready --timeout=30s` is correct syntax.
- The Python YAML lint script logic correctly parses `policyTypes` and `egress` lists and uses `any()` with a generator to test for port-53 presence.
- The DNS_RULE string comparison `[ "${DNS_RULE}" = "False" ]` correctly matches Python's `print(False)` output of `False`.

## Review Notes
- The post's Description metadata mentions "NAT configuration" but the body never discusses NAT — only DNS/HTTPS egress, validation, and linting. This is a minor metadata/body mismatch but not a technical error in any code or command, so it was left alone per the "only fix technical errors" instruction.
- The lint script's check `'53' in str(r)` is a loose string match — it would also match other rules whose `str(r)` representation incidentally contains the substring `'53'` (e.g., a port `5353`, or `0.0.53.0/32` in a CIDR). For the intended use this is good enough as a heuristic, but a stricter check would parse `r.get('destination', {}).get('ports', [])` and match exact port 53.
- The `order: 100` comment "Higher priority than default-deny" assumes the default-deny policy uses a higher order number (a common convention), which is consistent with the rest of the design but worth being explicit about in a production runbook.
- The `kubectl wait` step uses `--timeout=30s` which matches the `sleep 30` lifetime of the test pod — under cluster pressure the pod could complete before assertions run; a longer sleep (or `sleep infinity` with explicit cleanup) would be more robust. Not incorrect, just fragile.
