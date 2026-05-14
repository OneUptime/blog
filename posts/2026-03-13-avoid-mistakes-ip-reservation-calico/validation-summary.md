# Validation Summary: Avoid Mistakes When Reserving IPs in Calico IPAM

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico IPAM
- Calico `IPReservation` resource
- Calico `IPPool` resource
- `calicoctl`
- Kubernetes
- Bash

## Sources Consulted
- Calico IP reservation resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam` command overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation for using specific pod IPs and reserving IPs: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip

## Issues Found
- The post incorrectly said reservations are configured through `IPAMConfig`/`IPAMConfiguration`. Calico documents IP reservations with the `IPReservation` resource, so the introduction and prerequisites were updated.
- The post used nonexistent `calicoctl ipam reserve --ip ... --handle ...` commands and `calicoctl ipam show --show-reserved`. Current `calicoctl ipam` documentation lists `release`, `show`, and `configure` in the overview, and current `ipam show` documentation does not include `--show-reserved`. These examples were replaced with valid `IPReservation` YAML and `calicoctl apply/get` commands.
- The range reservation script called the nonexistent `calicoctl ipam reserve` command for every IP. It was replaced with a single `IPReservation` resource using `spec.reservedCIDRs`, which is the documented field for addresses and CIDRs.
- Step 4 said `allowedUses` can exclude specific reserved ranges. `allowedUses` controls whether an IPPool is used for workload, tunnel, or load balancer allocations; it does not express CIDR exclusions. The text was changed to recommend avoiding reserved ranges in automatic workload pools when the reserved range aligns with CIDR boundaries.
- The IPPool example claimed `10.244.16.0/20` starts after a reserved `10.244.0.0/28` and covers the rest of `10.244.0.0/16`. That CIDR actually starts after `10.244.0.0/20` and covers `10.244.16.0` through `10.244.31.255`, so the comments were corrected.
- Best-practice and conclusion wording referred to reservation handles and `calicoctl ipam reserve`; these were updated to refer to `IPReservation` resources.

## Review Notes
The corrected post is technically valid for current Calico documentation. `IPReservation` affects automatic IPAM allocation only; existing allocations are not released automatically, and explicit static pod IP annotations can still request reserved IPs. Future improvements could mention these caveats more prominently.
