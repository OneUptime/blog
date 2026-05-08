# Validation Summary: Validating Including Labels in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Kubernetes NetworkPolicy
- Cilium security identities
- Bash, jq, gawk, kubectl, and cilium CLI

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels - https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium command reference: cilium config view - https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium command reference: cilium-dbg identity list - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium documentation: Security Identities - https://docs.cilium.io/en/stable/internals/security-identities/
- Cilium documentation: Kubernetes policy selectors - https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Kubernetes documentation: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Cilium command reference: cilium connectivity perf - https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_perf/

## Issues Found
- The validation script treated Cilium's `labels` configuration as an exact list of literal label keys. Cilium documents these entries as regular expression patterns that are implicitly anchored at the start of the label key, and it also adds default inclusive patterns when inclusion is configured. I changed the script to compare policy label keys against configured include regex patterns plus Cilium's documented default inclusive patterns.
- The policy-label extraction only checked namespaced CiliumNetworkPolicy `matchLabels`. I expanded it to include CiliumClusterwideNetworkPolicy and Kubernetes NetworkPolicy resources, and to extract both `matchLabels` keys and `matchExpressions[].key` values.
- The identity-count examples used `cilium identity list`, which is not part of the modern external Cilium CLI command reference. I changed the examples to run `cilium-dbg identity list -o json` inside the Cilium agent DaemonSet and count the JSON identities with `jq`.
- The performance setup uncordoned nodes before applying the NoSchedule taint, which leaves a scheduling window for non-test workloads. I moved the taint before the uncordon command.
- The statistics snippet used `awk asort()`, which is a GNU awk extension. I changed the command to `gawk` so the dependency is explicit.

## Review Notes
- The post's guidance about keeping identity-relevant labels limited is consistent with Cilium's performance and scalability documentation.
- Cilium's documented `labels` Helm value appends to the default label patterns rather than replacing them. For exact declarative control of identity-relevant prefixes, Cilium documents `label-prefix-file` as the more precise option.
- Changing identity-relevant label configuration does not rewrite existing identities immediately; Cilium documents that affected Cilium pods/workloads need to be restarted for new identities to be allocated and old identities to be garbage-collected.
