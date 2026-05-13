# Validation Summary: How to Configure Flux with Calico Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux
- Calico Open Source
- Calico Enterprise
- Calico Cloud
- Calico GlobalNetworkPolicy
- Calico GlobalNetworkSet and NetworkSet
- DNS-based egress policy
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source GlobalNetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Cloud DNS/domain-based policy documentation: https://docs.tigera.io/calico-cloud/network-policy/domain-based-policy
- Calico Enterprise DNS/domain-based policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico Cloud FelixConfiguration DNS policy settings: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Flux CLI command documentation: https://fluxcd.io/flux/cmd/
- Flux source Git reconcile documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux source status documentation: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- GitHub Meta API for current GitHub service CIDRs: https://api.github.com/meta
- Docker allowlist documentation for Docker Hub domains: https://docs.docker.com/desktop/setup/allow-list/

## Issues Found
- The post implied that DNS-based FQDN policy was available in Calico Open Source with Calico v3.20+. Calico Open Source documentation does not expose `destination.domains` or `allowedEgressDomains`; those features are documented for Calico Enterprise and Calico Cloud. Updated the introduction, prerequisites, advantages list, Step 7, and DNS troubleshooting text to scope DNS-based policy to Calico Enterprise/Cloud.
- The Docker Hub GlobalNetworkSet used hardcoded public CIDRs that are not documented as Docker Hub's stable allowlist. Docker's documentation describes Docker Hub access in terms of domains and redirect domains. Replaced the Docker Hub CIDR example with a private registry or registry mirror CIDR placeholder and added guidance to use provider-published CIDRs or Calico Enterprise/Cloud DNS-based policy for public registries such as Docker Hub.
- The GitHub NetworkSet example listed static CIDRs without saying they must be refreshed from GitHub's official source. Added a note to replace the examples with current values from the GitHub Meta API.
- The DNS troubleshooting section described enabling a "DNS proxy" for Calico DNS policy. Current Calico Enterprise/Cloud documentation describes DNS policy behavior and `dnsTrustedServers` rather than a generic DNS proxy enablement step. Reworded the section to check DNS policy settings and override trusted DNS servers only when needed.

## Review Notes
The Calico GlobalNetworkPolicy, GlobalNetworkSet, selector, `services`, `Log`, and `order` examples are consistent with the official Calico resource documentation. The Flux verification commands are valid, but `flux get sources all` is documented as a preview command and may change in future Flux releases.
