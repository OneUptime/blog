# Validation Summary: How to Use Calico GlobalNetworkPolicy for Cluster-Wide Network Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico GlobalNetworkPolicy
- Calico policy tiers
- Calico HostEndpoint policy
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico quickstart installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico host endpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico selector-based host endpoint policy documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/selector
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Enterprise GlobalNetworkPolicy resource reference for domain-based policy caveat: https://docs.tigera.io/calico-enterprise/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The installation commands used Calico v3.27.0 and omitted the current CRD installation step from the Calico quickstart. Updated the commands to v3.32.0 and added `v1_crd_projectcalico_org.yaml`.
- The post said GlobalNetworkPolicy could block external domains without qualification. Calico Open Source documentation does not list `domains`; domain-based policy is documented for Calico Enterprise / Calico Cloud, so the wording was qualified.
- The Kubernetes API server egress rule combined `destination.services` with `ports`. Calico documents that egress destination `services` cannot be combined with other destination selection criteria, so the port match was removed.
- The same-namespace example used a non-documented `$namespace` variable. Replaced it with a valid namespace-specific GlobalNetworkPolicy using the automatic `projectcalico.org/name` namespace label and noted that equivalent policies are needed for other namespaces.
- Namespace selectors used `name == "monitoring"` and `name == "logging"`, which are not Calico's automatic namespace-name labels. Updated them to `projectcalico.org/name == ...`.
- The monitoring port range used `9090-9999`, but Calico port ranges use `start:end` syntax and should be strings. Updated it to `"9090:9999"`.
- The tiered GlobalNetworkPolicy placed `tier` under `metadata`. Calico tiered policy examples use `spec.tier`, so the snippet was corrected and the policy name was updated to include the tier prefix.
- The host endpoint policy used `has(host-endpoint)`, but HostEndpoint selection is based on labels assigned to HostEndpoint resources. Updated the example to assume role labels on HostEndpoint resources.
- The monitoring section described `calicoctl get felixconfiguration default -o yaml` as policy statistics. That command retrieves Felix configuration, so the wording was corrected.

## Review Notes
The examples are now technically aligned with the current Calico Open Source 3.32 documentation. Several snippets remain illustrative and require cluster-specific labels, namespace names, pod CIDRs, and HostEndpoint labels before use in a real cluster.
