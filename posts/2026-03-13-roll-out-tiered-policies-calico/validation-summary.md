# Validation Summary: How to Roll Out Calico Tiered Policies Safely in Calico

## Status
validated

## Post Type
Tutorial / Guide (phased rollout strategy)

## Technologies Covered
- Calico (open source network policy engine)
- Calico Tiered Policies (`projectcalico.org/v3` API)
- `calicoctl` CLI
- `kubectl` CLI
- Kubernetes (NetworkPolicy / GlobalNetworkPolicy resources)
- Mermaid (diagram in the Architecture section)

## Sources Consulted
- Calico documentation – `calicoctl` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico documentation – Network policy tiers: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico documentation – `projectcalico.org/v3` API: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation – `GlobalNetworkPolicy` resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- kubectl reference – `kubectl exec`, `kubectl get events`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
No technical issues found.

The bash and CLI snippets were each verified:

- `calicoctl get networkpolicies --all-namespaces` — valid; `calicoctl get` supports the plural resource name and the `--all-namespaces` flag.
- `calicoctl apply -f <file>.yaml` and `calicoctl apply -f <file>.yaml -n <namespace>` — valid syntax; `-n/--namespace` is supported on `calicoctl apply` for namespaced resources.
- `kubectl get events --all-namespaces | grep -i network | tail -20` — valid kubectl/coreutils pipeline.
- `kubectl exec -n staging test-pod -- curl -s http://staging-service:8080` — valid `kubectl exec` invocation.
- `for ns in production-a production-b production-c; do … done` loop — valid Bash; commands inside are correct.
- Mermaid `flowchart TD` with `{ }`, `[ ]` node shapes and `-->|label|` edges — valid Mermaid flowchart syntax.

The version prerequisite (`Calico v3.26+`) is consistent with versions in which the tier-aware `projectcalico.org/v3` API is generally available in open-source Calico, so it was left as-is.

## Review Notes
- The post is quite light on concrete Calico Tier / tiered-policy YAML; it never shows a `Tier` resource or a `GlobalNetworkPolicy`/`NetworkPolicy` that references a `tier:` field. A future revision would benefit from a short example tier and a policy that selects into it, so readers can actually see the tiered-policy mechanics referenced in the title and conclusion.
- `calicoctl apply -f file.yaml -n $ns` will apply the resource to namespace `$ns` only if the manifest itself does not already set `metadata.namespace`; a manifest-level namespace takes precedence. A note for the reader about this precedence rule would help avoid a subtle pitfall when iterating over namespaces.
- The grammar in a few phrasings ("Roll Out Tiered Policies policies", "techniques for roll out Tiered Policies", redundant "in Calico" in the title) is awkward but is a stylistic concern, not a technical one, and was intentionally left untouched per the review instructions.
- `sleep 300` / `sleep 120` between apply and verification are arbitrary; in production, polling for policy programming status (`calicoctl get felixconfiguration`, dataplane sync, or specific `kubectl get events`) is more reliable than a fixed wait, but the script as written is not incorrect.
- Mermaid renderers vary in how they treat `\n` inside node labels; most modern renderers (including GitHub's) support it, so it was left as-is. If a future renderer does not, switching to `<br/>` is the safest alternative.
