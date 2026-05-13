# Validation Summary: How to Migrate to Calico NodePort Traffic Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints
- Kubernetes NodePort Services
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host endpoint policy for Kubernetes nodes: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico policy for forwarded traffic and pre-DNAT behavior: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico policy for Kubernetes node ports: https://docs.tigera.io/calico-enterprise/latest/network-policy/beginners/services/kubernetes-node-ports
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Service and NodePort documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The policy used `ports: [30000-32767]`, which is not valid Calico port range syntax. Calico numeric ranges must be strings in `start:end` format, so this was changed to `ports: ['30000:32767']`.
- The prerequisites omitted the need for Calico host endpoints. `preDNAT` and `applyOnForward` are meaningful for policies applied to host endpoints, so a host endpoint prerequisite was added.
- The verification command curled `http://service-name:8080`, which verifies in-cluster Service DNS access rather than NodePort access. It was changed to curl `http://<node-ip>:<node-port>`.
- The introduction overstated ClusterIP exposure. It now focuses on NodePort access from sources that can reach the nodes.

## Review Notes
The example assumes node host endpoints have labels matched by the policy selector. Automatic host endpoints can sync Kubernetes node labels to host endpoints, but manually created host endpoints must be labeled consistently for the selector to match.
