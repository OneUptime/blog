# Validation Summary: Creating the Calico BGPConfiguration Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico BGPConfiguration
- Kubernetes custom resources
- kubectl
- calicoctl
- BGP autonomous system numbers

## Sources Consulted
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl configuration and kubectl guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico service IP advertisement guide: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- RFC 6996, Autonomous System Reservation for Private Use: https://datatracker.ietf.org/doc/rfc6996/

## Issues Found
- The prerequisites implied that any Calico installation can manage `projectcalico.org/v3` resources with `kubectl`. Updated the prerequisite to state that the Calico API server is needed for that workflow.
- The `asNumber` description listed only the 16-bit private ASN range. Updated it to include the RFC 6996 32-bit private ASN range and to match Calico's "valid AS Number" wording.
- The sample manifest was described as all defaults, but `serviceClusterIPs` and `serviceExternalIPs` are environment-specific examples and default to empty lists. Updated the explanation accordingly.
- The `calicoctl` section overstated that it catches errors `kubectl` would miss. Updated it to distinguish calicoctl client-side validation/defaulting from newer Calico API server-side validation used by kubectl.
- The verification command described "the specific resource" but omitted the `default` resource name. Updated the command to `kubectl describe bgpconfiguration.projectcalico.org default`.
- The log command assumed Calico always runs in `calico-system`. Added a note to adjust the namespace for installations that use `kube-system`.
- The troubleshooting advice checked the wrong namespace for the Calico API server and implied it is always required. Updated it to check `calico-apiserver` when using kubectl with the v3 API.
- The troubleshooting section recommended restarting calico-node too eagerly. Updated it to check logs first and restart only after confirming stale configuration, preferably during a maintenance window.
- The labels section implied node labels target BGPConfiguration resources directly. Updated it to explain that labels are used by selector-capable resources such as BGPPeer and IPPool, while node-specific BGPConfiguration overrides use `node.<nodename>` and support only limited fields.

## Review Notes
The manifest schema, field names, example CIDR format, kubectl syntax, calicoctl syntax, and log command flags are valid after the corrections. Future revisions could add a short note about `serviceLoadBalancerIPs`, which is also supported by BGPConfiguration, but it is not required for this post's stated scope.
