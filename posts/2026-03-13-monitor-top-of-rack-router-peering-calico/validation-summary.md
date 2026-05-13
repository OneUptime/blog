# Validation Summary: How to Monitor Top-of-Rack Router Peering with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- BGP (Border Gateway Protocol)
- Top-of-Rack (ToR) switches
- calicoctl CLI
- kubectl CLI

## Sources Consulted
- Calico official documentation — BGP peering and configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Tigera Operator namespace conventions (calico-system): https://docs.tigera.io/calico/latest/operations/operator-migration
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
No technical issues found.

The commands provided are syntactically correct and would work as described:
- `calicoctl get bgpconfiguration default -o yaml` is a valid calicoctl command for retrieving the default BGPConfiguration resource.
- `kubectl get nodes -o wide` is a valid kubectl command.
- `kubectl get pods -n calico-system` is the correct namespace for Tigera Operator-based Calico installations (v3.16+).

## Review Notes
- The post is very thin in terms of actual ToR peering monitoring details. While technically accurate, it does not actually demonstrate how to monitor BGP peering health (e.g., using `calicoctl node status`, `calicoctl get bgppeer`, scraping the Felix/BIRD Prometheus metrics endpoint, or wiring up alerting rules for `bird_bgp_session_state`). A future revision could expand the Steps section to include `calicoctl node status`, BGPPeer resource configuration, and Prometheus scrape configuration for the Calico Felix metrics endpoint on port 9091.
- For installations using the manifest-based (non-operator) Calico install, the namespace would be `kube-system` rather than `calico-system`. The post assumes the Tigera Operator install path, which is the current recommended approach.
- The description mentions Prometheus and alerting, but the body does not cover either. This is a content gap rather than a technical error.
