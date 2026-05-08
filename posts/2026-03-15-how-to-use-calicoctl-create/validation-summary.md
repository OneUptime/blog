# Validation Summary: How to Use calicoctl create with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes networking
- Calico GlobalNetworkPolicy
- Calico IPPool
- Calico BGPPeer
- Calico HostEndpoint
- Calico GlobalNetworkSet

## Sources Consulted
- Calico calicoctl create reference: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- Calico calicoctl install and kubectl guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico API server guidance for kubectl management: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico calicoctl Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset

## Issues Found
- The introduction said Calico-specific resources such as GlobalNetworkPolicy, IPPool, BGPPeer, and HostEndpoint require `calicoctl` for management. This was too absolute for current Calico. Official docs recommend `calicoctl` for `projectcalico.org/v3` APIs because it provides validation and defaulting, but Calico API server and native v3 CRD modes can allow `kubectl` management. Updated the sentence to say these resources are commonly managed with `calicoctl`.
- The multiple-resource section said resources can be separated by `---`. Calico's resource definition docs describe multiple resources in a single file as a YAML list. Updated the wording to match the documented format.

## Review Notes
The resource examples use valid `projectcalico.org/v3` kinds and fields according to the current Calico Open Source documentation. The HostEndpoint example is valid, but creating HostEndpoints can affect host traffic if matching policy is not already in place; this is a Calico operational caveat rather than a syntax issue in the post.
