# Validation Summary: How to Troubleshoot Filters in Cilium Hubble

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Hubble CLI
- Hubble exporter
- CiliumNetworkPolicy
- Kubernetes
- Helm
- Python JSON parsing

## Sources Consulted
- Cilium Hubble CLI guide: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Hubble CLI `observe --help` from Hubble v1.19.3
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7.html
- Cilium Hubble exporter configuration documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export.html
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
- The post described CLI filters as simple AND logic. Hubble CLI combines most different filters to narrow results, but broad relationship filters such as `--namespace` expand into source-or-destination alternatives. Updated the wording in the introduction and troubleshooting section.
- The post said pod names must match exactly. Current Hubble CLI help documents pod filters as pod name prefix filters. Updated the identity section and made the pod-name example describe ambiguous prefix matching.
- The endpoint inspection commands used `cilium endpoint list -o json`. Current Cilium command references document `cilium-dbg endpoint list -o json` for in-agent endpoint inspection. Updated both commands.
- The Python snippets read `external-identifiers.pod-name`, but Cilium's API reference documents the Kubernetes pod name under `external-identifiers.k8s-pod-name`. Updated both snippets.
- The L7 visibility section implied that adding a CiliumNetworkPolicy only enables observation. Official Cilium docs warn that L7 policies also enforce and can restrict traffic. Added a short warning comment before the policy example.
- The exporter examples described unqualified pod names as the issue. Hubble FlowFilters use namespace/name prefixes for pod filters, so the example was corrected to show unqualified pod prefix as wrong and namespace/name or namespace prefix as correct.
- The temporary Helm example for clearing the static allow list quoted the empty list syntax. Updated it to `--set hubble.export.static.allowList={}`, matching Helm list syntax for an empty list.

## Review Notes
The L7 visibility policy shown in the post is intentionally permissive for HTTP on TCP/8080, but it is still an enforcing policy. Readers should adapt endpoint selectors, direction, peer selectors, and ports to their application before applying it in a real cluster.
