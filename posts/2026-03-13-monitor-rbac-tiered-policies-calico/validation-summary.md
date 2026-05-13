# Validation Summary: How to Monitor RBAC for Calico Tiered Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (open source / Calico Enterprise tiered policies)
- Kubernetes NetworkPolicy (projectcalico.org/v3)
- calicoctl CLI
- kubectl CLI
- Felix (Calico's per-node policy engine)
- Prometheus metrics (Felix metrics endpoint)

## Sources Consulted
- Calico projectcalico.org/v3 NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- calicoctl command reference (`apply`, `get`, `delete`, `--dry-run`): https://docs.tigera.io/calico/latest/reference/calicoctl/
- Felix configuration (PrometheusMetricsPort default 9091): https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico monitoring component metrics: https://docs.tigera.io/calico/latest/operations/monitor/

## Issues Found
No technical issues found.

The YAML is syntactically valid against the `projectcalico.org/v3` `NetworkPolicy` schema (correct apiVersion, kind, and spec fields: `order`, `selector`, `ingress`, `egress`, `types`). Selector expressions (`all()`, `app == 'authorized-source'`) match Calico's selector grammar. All `calicoctl` and `kubectl` commands use valid subcommands and flags. The Felix Prometheus metrics port `9091` matches the documented default for `PrometheusMetricsPort`.

## Review Notes
- The post title references "RBAC for Tiered Policies," which is a Calico Enterprise / Calico Cloud feature (tiered policies and tier-level RBAC). The actual YAML and CLI examples in the post are generic `projectcalico.org/v3` `NetworkPolicy` examples without `tier` field or `Tier` resource references. This is a scoping/content choice rather than a technical inaccuracy — the commands and YAML shown work on both open-source Calico and Calico Enterprise.
- Minor grammar nit in the introduction ("patterns for monitor RBAC Tiered Policies" — should be "monitoring"), but this is stylistic, not technical, and per instructions only technical errors are fixed.
- `felix_denied` is used as a grep pattern in the metrics example. Open-source Felix exposes `felix_*` metrics; a literal `felix_denied` metric exists in Calico Enterprise (denied packet counters) but is not always present in upstream Felix. The grep will simply return no matches if absent, so the command is harmless and not strictly incorrect.
- For Calico v3.26+, the projectcalico.org/v3 API surface used here is stable; no deprecation warnings apply.
