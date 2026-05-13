# Validation Summary: How to Monitor BGP Security Designs in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BGPFilter
- BGPPeer
- Kubernetes Secrets

## Sources Consulted
- Calico Open Source BGPFilter resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico Open Source BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Project Calico API source for v3.26.0, v3.27.0, v3.28.0, v3.29.0, and v3.32.0: https://github.com/projectcalico/calico

## Issues Found
- The prerequisites listed `calicoctl v3.26+`, but the `prefixLength` field used in the BGPFilter example is not present in the Calico v3.26-v3.28 API source and appears in v3.29. Updated the prerequisite to Calico and calicoctl v3.29+.
- The BGPFilter prefix-length rules set `cidr` without `matchOperator`. Current Calico documentation and API validation require `cidr` and `matchOperator` to be set together. Added `matchOperator: In` to both reject rules so the rules match prefixes contained within `0.0.0.0/0` and constrained by the specified prefix lengths.

## Review Notes
- The Kubernetes secret command is syntactically valid, but `kubectl` was not installed in this local environment, so it could not be dry-run locally. The command format matches standard Kubernetes `kubectl create secret generic` usage.
- Calico documentation notes that the referenced BGP password secret must be in the same namespace as the `calico/node` pod and that the `calico-node` ServiceAccount must be able to read it.
