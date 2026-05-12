# Validation Summary: How to Roll Out Staged Kubernetes NetworkPolicy in Calico Safely

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes NetworkPolicy
- calicoctl CLI
- kubectl CLI
- Felix (Calico data plane agent) and its Prometheus metrics endpoint

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico StagedKubernetesNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico StagedNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- Felix Prometheus metrics: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
No technical issues found in the YAML or commands as written. The YAML is syntactically valid as a Calico `projectcalico.org/v3` `NetworkPolicy`:
- `apiVersion: projectcalico.org/v3` and `kind: NetworkPolicy` are valid.
- `order`, `selector`, `ingress`, `egress`, and `types` are valid Calico NetworkPolicy spec fields.
- `all()` and `app == 'authorized-source'` are valid Calico selector expressions.
- The `Allow` action with `protocol: UDP` and `ports: [53]` for DNS egress is correct.

The CLI commands are also valid:
- `calicoctl apply -f <file>` is correct.
- `calicoctl get networkpolicies -n <ns> -o wide` is valid form.
- `calicoctl get globalnetworkpolicies` is valid.
- `kubectl exec -n <ns> <pod> -- curl -s --max-time 5 ...` is correct.

## Review Notes
- Scope/content gap: the post is titled "Staged Kubernetes NetworkPolicy" but the YAML example is a regular Calico `NetworkPolicy` (not a `StagedKubernetesNetworkPolicy` or `StagedNetworkPolicy`). A true staged-policy example would use `kind: StagedKubernetesNetworkPolicy` (mirroring the upstream `networking.k8s.io/v1` `NetworkPolicy` spec with `podSelector`, `policyTypes`, and a `stagedAction` field) or `kind: StagedNetworkPolicy` (Calico-style spec with `stagedAction`). The post would benefit from either changing the YAML to demonstrate a staged policy or updating the title/prose to match the regular Calico NetworkPolicy actually shown. This is a content/scope mismatch rather than a syntactic error in what's printed.
- The post contains some templated-text artifacts (e.g., "production-tested patterns for roll out Staged K8s NetworkPolicy", "Roll Out Staged K8s NetworkPolicy in Calico requires..."). These are grammatical, not technical, and were left in place per instructions.
- The policy name in the YAML (`roll-out-staged-k8s-networkpolicy`) does not match the name referenced later in the Operational Commands section (`roll-out-policy`). The commands are still syntactically valid; they just refer to a hypothetical different policy.
- `curl -s http://localhost:9091/metrics | grep felix_denied`: Felix exposes Prometheus metrics on port 9091 by default (configurable via `PrometheusMetricsPort` in `FelixConfiguration`), so the endpoint is correct. However, `felix_denied` is not a standard Felix metric name in open-source Calico; denied-packet counters are typically exposed in Calico Enterprise (e.g., `cnx_policy_rule_packets{action="deny"}`). The grep command will silently return no results on stock OSS Calico but won't error, so it remains syntactically valid.
- Calico v3.26+ is a reasonable floor for the `projectcalico.org/v3` API and staged policy support; readers on older Calico versions should verify their installation has the relevant CRDs.
