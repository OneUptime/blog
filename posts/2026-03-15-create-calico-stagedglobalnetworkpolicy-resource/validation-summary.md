# Validation Summary: How to Create the Calico StagedGlobalNetworkPolicy Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico StagedGlobalNetworkPolicy
- Calico GlobalNetworkPolicy
- Kubernetes custom resources
- Calico network policy tiers, selectors, namespace selectors, and service account rules
- Calico flow logs / Whisker / Enterprise and Cloud flow-log sinks
- `kubectl`

## Sources Consulted
- Calico staged global network policy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico stage, preview impacts, and enforce policy documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico flow log data types: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes
- Calico Open Source flow log / Whisker documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Calico namespace selector policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post stated that staged policies require Calico Enterprise or Calico Cloud and that open-source Calico does not support staged policies. Current Calico Open Source documentation includes `StagedGlobalNetworkPolicy` resources and staged policy workflows, so this was changed to require staged policy CRDs and a Calico version that supports them.
- The post described staged policy results as generic staged verdicts in `calico-node` logs. Official flow-log documentation describes policy impact through flow-log policy fields such as pending policies, with staged policy names prefixed by `staged:`. The review section was updated to direct readers to Whisker or the configured Enterprise/Cloud flow-log sink instead of grepping `calico-node` logs.
- The examples used `calicoctl` for staged policy CRUD operations, but the current staged resource documentation explicitly documents Kubernetes CRD aliases for `kubectl`, while the current `calicoctl get` reference does not list staged policy resources. Commands were changed to use `kubectl` and fully qualified Project Calico resource names.
- The promotion workflow exported a staged resource and only instructed changing `kind` and `metadata.name`. Kubernetes exports commonly include server-generated metadata and status that should not be applied as a new resource. The instructions now say to remove generated metadata and `status` if present.
- The namespace isolation example hard-coded `10.96.0.10/32` as DNS. This is only correct for clusters where that is the DNS service IP, so the example now tells readers to replace it with their cluster DNS service IP.

## Review Notes
The YAML policy examples use valid `projectcalico.org/v3` staged global network policy fields and valid rule actions (`Allow`, `Deny`, and `Pass`) according to the Calico resource reference. The post does not pin a Calico version, so the validation was performed against current Calico documentation as of 2026-05-08.
