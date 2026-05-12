# Validation Summary: How to Roll Out Calico Tiered Policies Safely

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes NetworkPolicy
- calicoctl CLI
- kubectl CLI

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors

## Issues Found
No technical issues found. The YAML structure for the Calico NetworkPolicy is valid:
- `apiVersion: projectcalico.org/v3` is correct.
- `kind: NetworkPolicy` is a valid Calico resource.
- Fields `order`, `selector`, `ingress`, `egress`, `types` are valid spec fields.
- The `all()` selector and `app == 'authorized'` selector expressions are valid Calico selector syntax.
- The `Allow` action with UDP protocol and port 53 for egress is syntactically correct.

The CLI commands are also valid:
- `calicoctl apply -f <file>` is correct.
- `calicoctl get networkpolicies -n <ns> -o wide` is a valid command form.
- `kubectl exec` with `--` separator and `curl` flags is correct.

## Review Notes
- The post contains several stylistic/grammatical artifacts that look like templated text was not fully edited (e.g., "Roll Out Calico Tiered Policies Safely in Calico", "how to roll Roll Out Calico Tiered Policies Safely", "Roll Roll Out Calico Tiered Policies Safely in Calico"). These are not technical errors, so per instructions they were not modified, but a future editorial pass would improve readability.
- The post's title promises a "phased rollout strategy for tiered policies" but the example shown is a single namespaced `NetworkPolicy` and does not actually demonstrate Calico `Tier` resources or a phased/staged rollout strategy. Calico `Tier` resources (and `tier:` field in policies) would be the natural fit for a "tiered policy" guide. This is a scope/content gap rather than a technical inaccuracy in what is shown.
- The example NetworkPolicy omits a `tier:` field and therefore defaults to the `default` tier, which is technically valid.
- The post does not specify a Calico version-specific caveat: open-source Calico added broader tier support in more recent versions; readers using older versions should verify that `Tier` features are available in their installation.
