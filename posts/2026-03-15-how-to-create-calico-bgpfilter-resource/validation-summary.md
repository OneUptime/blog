# Validation Summary: How to Create the Calico BGPFilter Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico BGPFilter resources
- Calico BGPPeer resources
- Kubernetes
- BGP route filtering
- calicoctl
- kubectl

## Sources Consulted
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Project Calico API Go package reference for BGPFilter match operators: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The post said `matchOperator` supports only `In`, `NotIn`, and `Equal`. Calico's current BGPFilter schema also supports `NotEqual`, so the schema explanation was updated.
- The post described first-match rule evaluation but did not mention the default behavior when no rule matches. Calico accepts routes by default when no explicit BGPFilter rule matches, so this was added to avoid implying an implicit deny.

## Review Notes
The YAML examples use the current `projectcalico.org/v3` BGPFilter and BGPPeer fields, and the `calicoctl apply` / `calicoctl get` commands are valid according to the current Calico documentation. The catch-all reject examples are important because unmatched routes are accepted by default.
