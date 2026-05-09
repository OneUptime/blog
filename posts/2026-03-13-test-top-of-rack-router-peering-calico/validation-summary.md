# Validation Summary: How to Test Top-of-Rack Router Peering with Calico with Live Workloads

## Status
not-technically-relevant

## Post Type
Placeholder guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- Top-of-rack router peering
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Configure BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Kubernetes documentation: kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post is titled and described as a guide for testing top-of-rack router peering with live workloads, including switch failure and route convergence scenarios, but it does not include any ToR BGPPeer configuration, workload traffic generation, BGP session validation, failover test, convergence measurement, or rollback guidance.
- The Calico documentation shows that ToR peering normally requires explicit BGP topology configuration, such as BGPPeer resources and often disabling the default node-to-node mesh. The post only runs generic inspection commands and does not test ToR peering behavior.
- The Calico documentation recommends checking BGP peering status with `calicoctl node status` on the relevant node or a `CalicoNodeStatus` resource. The post does not include either approach, so its stated testing goal is not technically supported.
- No README.md changes were made because turning this placeholder into a technically correct live-workload ToR peering test would require adding substantial topology-specific content rather than making a narrow correctness fix.

## Review Notes
The individual commands shown are syntactically plausible: `calicoctl get bgpconfiguration default -o yaml`, `kubectl get nodes -o wide`, and `kubectl get pods -n calico-system` are valid inspection-style commands in appropriate environments. However, they are insufficient for the stated topic and do not validate ToR BGP peering, live workload behavior, switch failure handling, or route convergence.
